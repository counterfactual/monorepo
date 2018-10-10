import * as ethers from "ethers";
import * as _ from "lodash";
import * as machine from "@counterfactual/machine";

import { AppChannelClient } from "./app-channel-client";
import { ClientInterface } from "./client-interface";

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

  public async deposit(
    balanceRefundAddress: machine.types.Address,
    abiEncoding: string,
    stateEncoding: string,
    amount: ethers.utils.BigNumber,
    threshold: ethers.utils.BigNumber
  ) {
    const stateChannelInfo = await this.queryStateChannel();
    const isPeerA =
      stateChannelInfo.data.stateChannel.freeBalance.alice === this.fromAddress;
    const options: machine.types.InstallOptions = {
      appAddress: balanceRefundAddress,
      peerABalance: ethers.utils.bigNumberify(0),
      peerBBalance: ethers.utils.bigNumberify(0),
      state: {
        recipient: this.fromAddress,
        multisig: this.multisigAddress,
        threshold
      },
      abiEncoding: abiEncoding,
      stateEncoding: stateEncoding
    };

    const balanceRefund = await this.install("ETHBalanceRefundApp", options);
    await this.depositToMultisig(amount);
    await balanceRefund.uninstall({
      peerABalance: isPeerA ? amount : ethers.utils.bigNumberify(0),
      peerBBalance: isPeerA ? ethers.utils.bigNumberify(0) : amount
    });
  }

  public async install(
    appName: string,
    options: machine.types.InstallOptions
  ): Promise<AppChannelClient> {
    let peerA = this.fromAddress;
    let peerB = this.toAddress;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
    const terms = new machine.cfTypes.Terms(
      0,
      options.peerABalance.add(options.peerBBalance),
      ethers.constants.AddressZero
    );
    const app = this.buildAppInterface(
      options.appAddress,
      options.abiEncoding,
      options.stateEncoding
    );
    const state = options.state;
    const encodedAppState = app.encode(state);
    const timeout = 100;
    const signingKeys = [this.toAddress, this.fromAddress];
    signingKeys.sort((addrA: string, addrB: string) => {
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });

    const installData: machine.types.InstallData = {
      peerA: new machine.types.PeerBalance(peerA, options.peerABalance),
      peerB: new machine.types.PeerBalance(peerB, options.peerBBalance),
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

  public async queryFreeBalance(): Promise<
    machine.types.FreeBalanceClientResponse
  > {
    const freeBalanceQuery: machine.types.ClientQuery = {
      requestId: this.clientInterface.requestId(),
      action: machine.types.ActionName.QUERY,
      query: machine.types.ClientQueryType.FreeBalance,
      multisigAddress: this.multisigAddress
    };
    const freeBalanceData = (await this.clientInterface.sendMessage(
      freeBalanceQuery
    )) as machine.types.FreeBalanceClientResponse;

    return freeBalanceData;
  }

  public async queryStateChannel(): Promise<
    machine.types.StateChannelDataClientResponse
  > {
    const stateChannelQuery: machine.types.ClientQuery = {
      action: machine.types.ActionName.QUERY,
      requestId: this.clientInterface.requestId(),
      query: machine.types.ClientQueryType.StateChannel,
      multisigAddress: this.multisigAddress
    };
    const stateChannelData = (await this.clientInterface.sendMessage(
      stateChannelQuery
    )) as machine.types.StateChannelDataClientResponse;

    return stateChannelData;
  }
  private buildAppInterface(
    appAddress: machine.types.Address,
    abiEncoding: string,
    stateEncoding: string
  ): machine.cfTypes.CfAppInterface {
    const encoding = JSON.parse(abiEncoding);
    const abi = new ethers.utils.Interface(encoding);

    const appInterface = new machine.cfTypes.CfAppInterface(
      appAddress,
      machine.cfTypes.CfAppInterface.generateSighash(abi, "applyAction"),
      machine.cfTypes.CfAppInterface.generateSighash(abi, "resolve"),
      machine.cfTypes.CfAppInterface.generateSighash(abi, "getTurnTaker"),
      machine.cfTypes.CfAppInterface.generateSighash(abi, "isStateTerminal"),
      stateEncoding
    );
    return appInterface;
  }

  private async depositToMultisig(value: ethers.utils.BigNumber) {
    const depositMessage = {
      action: machine.types.ActionName.DEPOSIT,
      requestId: this.clientInterface.requestId(),
      data: {
        multisig: this.multisigAddress,
        value
      }
    };

    await this.clientInterface.sendMessage(depositMessage);
  }
}
