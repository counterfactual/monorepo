import { CfAppInterface } from "../src/middleware/cf-operation/types";
import {
  ActionName,
  ClientResponse,
  PeerBalance,
  UninstallOptions,
  UpdateData,
  UpdateOptions
} from "../src/types";

import { StateChannelClient } from "./state-channel-client";

export class AppChannelClient {
  public stateChannel: StateChannelClient;
  public appName: string;
  public appId: string;
  public appInterface: CfAppInterface;

  constructor(
    stateChannel: StateChannelClient,
    appName: string,
    appId: string,
    appInterface: CfAppInterface,
    options
  ) {
    this.stateChannel = stateChannel;
    this.appName = appName;
    this.appId = appId;
    this.appInterface = appInterface;
  }

  public async update(options: UpdateOptions): Promise<ClientResponse> {
    const encodedAppState = this.appInterface.encode(options.state);
    const appStateHash = this.appInterface.stateHash(options.state);
    const updateData: UpdateData = {
      encodedAppState,
      appStateHash
    };
    const message = {
      requestId: this.stateChannel.clientInterface.requestId(),
      appName: this.appName,
      appId: this.appId,
      action: ActionName.UPDATE,
      data: updateData,
      multisigAddress: this.stateChannel.multisigAddress,
      fromAddress: this.stateChannel.fromAddress,
      toAddress: this.stateChannel.toAddress,
      stateChannel: undefined,
      seq: 0
    };
    return this.stateChannel.clientInterface.sendMessage(message);
  }

  public async uninstall(options: UninstallOptions): Promise<ClientResponse> {
    const uninstallData = {
      peerAmounts: [
        new PeerBalance(this.stateChannel.fromAddress, options.peerABalance),
        new PeerBalance(this.stateChannel.toAddress, options.peerBBalance)
      ]
    };

    const message = {
      requestId: this.stateChannel.clientInterface.requestId(),
      appName: this.appName,
      appId: this.appId,
      action: ActionName.UNINSTALL,
      data: uninstallData,
      multisigAddress: this.stateChannel.multisigAddress,
      fromAddress: this.stateChannel.fromAddress,
      toAddress: this.stateChannel.toAddress,
      stateChannel: undefined,
      seq: 0
    };
    return this.stateChannel.clientInterface.sendMessage(message);
  }
}
