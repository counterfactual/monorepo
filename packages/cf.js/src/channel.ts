import * as machine from "@counterfactual/machine";
import * as ethers from "ethers";
import * as _ from "lodash";

import { AppChannelClient } from "./app-channel-client";
import { AppInstance } from "./app-instance";
import { Client } from "./client";
import { ETHBalanceRefundApp } from "./eth-balance-refund-app";
import * as types from "./types";

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
    address: machine.types.Address,
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
  ): Promise<AppChannelClient> {
    let peerA = this.fromAddress;
    let peerB = this.toAddress;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
    const app = this.buildAppInterface(appInstance.app);

    const encodedAppState = app.encode(initialState);

    const installData: machine.types.InstallData = {
      encodedAppState,
      app,
      terms: appInstance.terms,
      timeout: appInstance.timeout,
      peerA: new machine.utils.PeerBalance(peerA, deposits[peerA]),
      peerB: new machine.utils.PeerBalance(peerB, deposits[peerB]),
      keyA: appInstance.signingKeys[0],
      keyB: appInstance.signingKeys[1]
    };

    const requestId = this.client.requestId();

    const message = {
      requestId,
      appName: name,
      appId: undefined,
      action: machine.types.ActionName.INSTALL,
      data: installData,
      multisigAddress: this.multisigAddress,
      toAddress: this.toAddress,
      fromAddress: this.fromAddress,
      stateChannel: undefined,
      seq: 0
    };

    return new Promise<AppChannelClient>(async resolve => {
      const cb = data => {
        if (data.data.requestId !== requestId) {
          return;
        }
        const appId = data.data.result.cfAddr;

        return resolve(new AppChannelClient(this, name, appId, app));
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
  ): Promise<AppChannelClient> {
    const {
      data: {
        stateChannel: { appChannels }
      }
    } = await this.queryStateChannel();
    const appChannel = appChannels[appId];
    const appInterface = this.buildAppInterface(appDefinition);
    return new AppChannelClient(this, name, appId, appInterface);
  }

  public async queryFreeBalance(): Promise<
    machine.types.FreeBalanceClientResponse
  > {
    const freeBalanceQuery: machine.types.ClientQuery = {
      requestId: this.client.requestId(),
      action: machine.types.ActionName.QUERY,
      query: machine.types.ClientQueryType.FreeBalance,
      multisigAddress: this.multisigAddress
    };
    const freeBalanceData = (await this.client.sendMessage(
      freeBalanceQuery
    )) as machine.types.FreeBalanceClientResponse;

    return freeBalanceData;
  }

  public async queryStateChannel(): Promise<
    machine.types.StateChannelDataClientResponse
  > {
    const stateChannelQuery: machine.types.ClientQuery = {
      action: machine.types.ActionName.QUERY,
      requestId: this.client.requestId(),
      query: machine.types.ClientQueryType.StateChannel,
      multisigAddress: this.multisigAddress
    };
    const stateChannelData = (await this.client.sendMessage(
      stateChannelQuery
    )) as machine.types.StateChannelDataClientResponse;

    return stateChannelData;
  }
  private buildAppInterface(
    appDefinition: types.AppDefinition
  ): machine.cfTypes.CfAppInterface {
    const encoding = JSON.parse(appDefinition.appActionEncoding);
    const abi = new ethers.utils.Interface(encoding);

    const appInterface = new machine.cfTypes.CfAppInterface(
      appDefinition.address,
      machine.cfTypes.CfAppInterface.generateSighash(abi, "applyAction"),
      machine.cfTypes.CfAppInterface.generateSighash(abi, "resolve"),
      machine.cfTypes.CfAppInterface.generateSighash(abi, "getTurnTaker"),
      machine.cfTypes.CfAppInterface.generateSighash(abi, "isStateTerminal"),
      appDefinition.appStateEncoding
    );
    return appInterface;
  }

  private async depositToMultisig(value: ethers.utils.BigNumber) {
    const depositMessage = {
      action: machine.types.ActionName.DEPOSIT,
      requestId: this.client.requestId(),
      data: {
        value,
        multisig: this.multisigAddress
      }
    };

    await this.client.sendMessage(depositMessage);
  }
}
