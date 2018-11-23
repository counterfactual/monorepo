import * as ethers from "ethers";

import { AppInstanceInfos, AppInterface, InstallData } from "./app";
import { AppInstance } from "./app-instance";
import { AppInstanceClient } from "./app-instance-client";
import { Client } from "./client";
import { ETHBalanceRefundApp } from "./eth-balance-refund-app";
import {
  ActionName,
  ClientQuery,
  ClientQueryType,
  FreeBalanceClientResponse,
  StateChannelDataClientResponse
} from "./node";
import * as types from "./types";
import { Address, FreeBalance, PeerBalance } from "./utils";

export class Channel {
  public client: Client;
  public toAddress: string;
  public fromAddress: string;
  public multisigAddress: string;

  constructor(
    toAddress: string,
    fromAddress: string,
    multisigAddress: string,
    client: Client
  ) {
    this.client = client;
    this.multisigAddress = multisigAddress;
    this.toAddress = toAddress;
    this.fromAddress = fromAddress;
  }

  public async deposit(
    address: Address,
    amount: ethers.utils.BigNumber,
    threshold: ethers.utils.BigNumber
  ) {
    const stateChannelInfo = await this.queryStateChannel();
    const isPeerA =
      stateChannelInfo.data.stateChannel.freeBalance.alice === this.fromAddress;

    const signingKeys = [this.toAddress, this.fromAddress];
    const appInstance = new ETHBalanceRefundApp(address, signingKeys);
    const deposits = {
      [this.fromAddress]: ethers.utils.bigNumberify("0"),
      [this.toAddress]: ethers.utils.bigNumberify("0")
    };
    const state = [this.fromAddress, this.multisigAddress, threshold];

    const balanceRefund = await this.install(
      "ETHBalanceRefundApp",
      appInstance,
      deposits,
      state
    );
    await this.depositToMultisig(amount);
    await balanceRefund.uninstall({
      peerABalance: isPeerA ? amount : ethers.utils.bigNumberify(0),
      peerBBalance: isPeerA ? ethers.utils.bigNumberify(0) : amount
    });
  }

  public async install(
    name: string,
    appInstance: AppInstance,
    deposits: types.Deposits,
    initialState: Object
  ): Promise<AppInstanceClient> {
    let peerA = this.fromAddress;
    let peerB = this.toAddress;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
    const app = this.buildAppInterface(appInstance.app);
    const encodedAppState = app.encode(initialState);

    const installData: InstallData = {
      encodedAppState,
      app,
      terms: appInstance.terms,
      timeout: appInstance.timeout,
      peerA: new PeerBalance(peerA, deposits[peerA]),
      peerB: new PeerBalance(peerB, deposits[peerB]),
      keyA: appInstance.signingKeys[0],
      keyB: appInstance.signingKeys[1]
    };

    const requestId = this.client.generateRequestId();
    const message = {
      requestId,
      appName: name,
      appId: undefined,
      action: ActionName.INSTALL,
      data: installData,
      multisigAddress: this.multisigAddress,
      toAddress: this.toAddress,
      fromAddress: this.fromAddress,
      stateChannel: undefined,
      seq: 0
    };

    return new Promise<AppInstanceClient>(async resolve => {
      const cb = data => {
        if (data.data.requestId !== requestId) {
          return;
        }
        const appId = data.data.result.cfAddr;

        return resolve(new AppInstanceClient(this, name, appId, app));
      };

      await this.client.addObserver("installCompleted", cb);
      await this.client.sendMessage(message);
      this.client.removeObserver("installCompleted", cb);
    });
  }

  public async getAppInstance(
    appId: string,
    name: string,
    appDefinition: types.AppDefinition
  ): Promise<AppInstanceClient> {
    const appInterface = this.buildAppInterface(appDefinition);
    return new AppInstanceClient(this, name, appId, appInterface);
  }

  public async queryFreeBalance(): Promise<FreeBalanceClientResponse> {
    const freeBalanceQuery: ClientQuery = {
      requestId: this.client.generateRequestId(),
      action: ActionName.QUERY,
      query: ClientQueryType.FreeBalance,
      multisigAddress: this.multisigAddress
    };
    const freeBalanceData = (await this.client.sendMessage(
      freeBalanceQuery
    )) as FreeBalanceClientResponse;

    return freeBalanceData;
  }

  public async queryStateChannel(): Promise<StateChannelDataClientResponse> {
    const stateChannelQuery: ClientQuery = {
      action: ActionName.QUERY,
      requestId: this.client.generateRequestId(),
      query: ClientQueryType.StateChannel,
      multisigAddress: this.multisigAddress
    };
    const stateChannelData = (await this.client.sendMessage(
      stateChannelQuery
    )) as StateChannelDataClientResponse;

    return stateChannelData;
  }
  private buildAppInterface(appDefinition: types.AppDefinition): AppInterface {
    const encoding = JSON.parse(appDefinition.appActionEncoding);
    const abi = new ethers.utils.Interface(encoding);

    const appInterface = new AppInterface(
      appDefinition.address,
      AppInterface.generateSighash(abi, "applyAction"),
      AppInterface.generateSighash(abi, "resolve"),
      AppInterface.generateSighash(abi, "getTurnTaker"),
      AppInterface.generateSighash(abi, "isStateTerminal"),
      appDefinition.appStateEncoding
    );
    return appInterface;
  }

  private async depositToMultisig(value: ethers.utils.BigNumber) {
    const depositMessage = {
      action: ActionName.DEPOSIT,
      requestId: this.client.generateRequestId(),
      data: {
        value,
        multisig: this.multisigAddress
      }
    };

    await this.client.sendMessage(depositMessage);
  }
}

export interface StateChannelInfo {
  counterParty: Address;
  me: Address;
  multisigAddress: Address;
  appInstances: AppInstanceInfos;
  freeBalance: FreeBalance;

  // TODO: Move this out of the datastructure
  // https://github.com/counterfactual/monorepo/issues/127
  /**
   * @returns the addresses of the owners of this state channel sorted
   *          in alphabetical order.
   */
  owners(): string[];
}

// a mapping from multisig address to a StateChannelInfo struct containing
// details about the channel associated with that multisig
export interface StateChannelInfos {
  [s: string]: StateChannelInfo;
}
