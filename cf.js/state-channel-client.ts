import * as ethers from "ethers";
import * as _ from "lodash";
import ETHBalanceRefundApp from "../contracts/build/contracts/ETHBalanceRefundApp.json";
import PaymentApp from "../contracts/build/contracts/PaymentApp.json";
import {
  ActionName,
  ClientActionMessage,
  ClientQuery,
  ClientQueryType,
  FreeBalanceClientResponse,
  InstallData,
  InstallOptions,
  PeerBalance,
  StateChannelDataClientResponse
} from "../src/types";

import { CfAppInterface, Terms } from "../src/middleware/cf-operation/types";

import { AppChannelClient } from "./app-channel-client";
import { ClientInterface } from "./client-interface";

// TODO stop hardcoding contracts
const Contracts = {
  ETHBalanceRefundApp,
  PaymentApp
};

const ETHBalanceRefundEncoding = {
  state: "tuple(address recipient, address multisig, uint256 threshold)",
  functions:
    "resolve(tuple(address,address,uint256),tuple(uint8,uint256,address))"
};

export class StateChannelClient {
  public clientInterface: ClientInterface;
  public toAddress: string;
  public fromAddress: string;
  public multisigAddress: string;

  constructor(
    toAddress: string,
    fromAddress: string,
    multisigAddress: string,
    clientInterface: ClientInterface
  ) {
    this.clientInterface = clientInterface;
    this.multisigAddress = multisigAddress;
    this.toAddress = toAddress;
    this.fromAddress = fromAddress;
  }

  public async deposit(amount: ethers.BigNumber, threshold: ethers.BigNumber) {
    const stateChannelInfo = await this.queryStateChannel();
    const isPeerA =
      stateChannelInfo.data.stateChannel.freeBalance.alice === this.fromAddress;
    const balanceRefund = await this.install("ETHBalanceRefundApp", {
      peerABalance: ethers.utils.bigNumberify(0),
      peerBBalance: ethers.utils.bigNumberify(0),
      state: {
        recipient: this.fromAddress,
        multisig: this.multisigAddress,
        threshold
      },
      abiEncoding: ETHBalanceRefundEncoding.functions,
      stateEncoding: ETHBalanceRefundEncoding.state
    });
    await this.depositToMultisig(amount);
    await balanceRefund.uninstall({
      peerABalance: isPeerA ? amount : ethers.utils.bigNumberify(0),
      peerBBalance: isPeerA ? ethers.utils.bigNumberify(0) : amount
    });
  }

  public async install(
    appName: string,
    options: InstallOptions
  ): Promise<AppChannelClient> {
    let peerA = this.fromAddress;
    let peerB = this.toAddress;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
    const terms = new Terms(
      0,
      options.peerABalance.add(options.peerBBalance),
      ethers.constants.AddressZero
    );
    const app = this.buildAppInterface(
      appName,
      options.abiEncoding,
      options.stateEncoding
    );
    const state = options.state;
    const encodedAppState = app.encode(state);
    const timeout = 100;
    const signingKeys = [this.toAddress, this.fromAddress];
    signingKeys.sort((addrA: string, addrB: string) => {
      return new ethers.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });

    const installData: InstallData = {
      peerA: new PeerBalance(peerA, options.peerABalance),
      peerB: new PeerBalance(peerB, options.peerBBalance),
      // TODO: provide actual signing keys
      keyA: signingKeys[0],
      keyB: signingKeys[1],
      encodedAppState,
      terms,
      app,
      timeout
    };
    const requestId = this.clientInterface.requestId();
    const message = {
      requestId,
      appName,
      appId: undefined,
      action: ActionName.INSTALL,
      data: installData,
      multisigAddress: this.multisigAddress,
      toAddress: this.toAddress,
      fromAddress: this.fromAddress,
      stateChannel: undefined,
      seq: 0
    };

    return new Promise<AppChannelClient>(async resolve => {
      const cb = data => {
        if (data.data.requestId !== requestId) return;
        const appId = data.data.result.cfAddr;

        return resolve(
          new AppChannelClient(this, appName, appId, app, options)
        );
      };

      await this.clientInterface.addObserver("installCompleted", cb);
      await this.clientInterface.sendMessage(message);
      this.clientInterface.removeObserver("installCompleted", cb);
    });
  }

  public restore(
    appName: string,
    appId: string,
    abiEncoding: string,
    stateEncoding: string,
    options: object
  ): AppChannelClient {
    const appInterface = this.buildAppInterface(
      appName,
      abiEncoding,
      stateEncoding
    );
    return new AppChannelClient(this, appName, appId, appInterface, options);
  }

  public async queryFreeBalance(): Promise<FreeBalanceClientResponse> {
    const freeBalanceQuery: ClientQuery = {
      requestId: this.clientInterface.requestId(),
      action: ActionName.QUERY,
      query: ClientQueryType.FreeBalance,
      multisigAddress: this.multisigAddress
    };
    const freeBalanceData = (await this.clientInterface.sendMessage(
      freeBalanceQuery
    )) as FreeBalanceClientResponse;

    return freeBalanceData;
  }

  public async queryStateChannel(): Promise<StateChannelDataClientResponse> {
    const stateChannelQuery: ClientQuery = {
      action: ActionName.QUERY,
      requestId: this.clientInterface.requestId(),
      query: ClientQueryType.StateChannel,
      multisigAddress: this.multisigAddress
    };
    const stateChannelData = (await this.clientInterface.sendMessage(
      stateChannelQuery
    )) as StateChannelDataClientResponse;

    return stateChannelData;
  }
  private buildAppInterface(
    appName: string,
    abiEncoding: string,
    stateEncoding: string
  ): CfAppInterface {
    const capitalizedAppName = appName[0].toUpperCase() + appName.slice(1);
    const contract = Contracts[capitalizedAppName];
    const address =
      contract && _.keys(contract.networks).length > 0
        ? contract.networks[_.keys(contract.networks)[0]].address
        : "0x0";
    const abiInterface = new ethers.Interface(
      contract ? contract.abi : abiEncoding
    );

    const appInterface = new CfAppInterface(
      address,
      CfAppInterface.generateSighash(abiInterface, "applyAction"),
      CfAppInterface.generateSighash(abiInterface, "resolve"),
      CfAppInterface.generateSighash(abiInterface, "getTurnTaker"),
      CfAppInterface.generateSighash(abiInterface, "isStateTerminal"),
      stateEncoding
    );
    return appInterface;
  }

  private async depositToMultisig(value: ethers.BigNumber) {
    const depositMessage = {
      action: ActionName.DEPOSIT,
      requestId: this.clientInterface.requestId(),
      data: {
        multisig: this.multisigAddress,
        value
      }
    };

    await this.clientInterface.sendMessage(depositMessage);
  }
}
