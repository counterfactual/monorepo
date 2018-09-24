import * as ethers from "ethers";
import PaymentApp from "../contracts/build/contracts/PaymentApp.json";
import {
  ActionName,
  ClientQuery,
  ClientQueryType,
  FreeBalanceClientResponse,
  InstallData,
  InstallOptions,
  PeerBalance,
  StateChannelDataClientResponse
} from "../src/types";

import {
  CfAppInterface,
  Terms,
  zeroAddress
} from "../src/middleware/cf-operation/types";

import { AppChannelClient } from "./app-channel-client";
import { ClientInterface } from "./client-interface";

const Contracts = {
  PaymentApp
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
    const terms = new Terms(0, 10, zeroAddress); // todo

    const app = this.buildAppInterface(appName, options.abiEncoding);
    const state = options.state;
    const encodedAppState = app.encode(state);
    const timeout = 100;
    const installData: InstallData = {
      peerA: new PeerBalance(peerA, options.peerABalance),
      peerB: new PeerBalance(peerB, options.peerBBalance),
      // TODO provide actual signing keys?
      keyA: this.toAddress,
      keyB: this.fromAddress,
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
    options: object
  ): AppChannelClient {
    const appInterface = this.buildAppInterface(appName, abiEncoding);
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
    abiEncoding: string
  ): CfAppInterface {
    const capitalizedAppName = appName[0].toUpperCase() + appName.slice(1);
    const contract = Contracts[capitalizedAppName];
    const address = contract
      ? contract.networks[Object.keys(contract.networks)[0]].address
      : "0x0";
    const abiInterface = new ethers.Interface(contract ? contract.abi : "");

    return new CfAppInterface(
      address,
      CfAppInterface.generateSighash(abiInterface, "applyAction"),
      CfAppInterface.generateSighash(abiInterface, "resolve"),
      CfAppInterface.generateSighash(abiInterface, "getTurnTaker"),
      CfAppInterface.generateSighash(abiInterface, "isStateTerminal"),
      abiEncoding
    );
  }
}
