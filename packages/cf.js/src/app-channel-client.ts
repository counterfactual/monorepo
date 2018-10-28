import * as machine from "@counterfactual/machine";

import { Channel } from "./channel";

export class AppChannelClient {
  public stateChannel: Channel;
  public appName: string;
  public appId: string;
  public appInterface: machine.cfTypes.CfAppInterface;

  constructor(
    stateChannel: Channel,
    appName: string,
    appId: string,
    appInterface: machine.cfTypes.CfAppInterface
  ) {
    this.stateChannel = stateChannel;
    this.appName = appName;
    this.appId = appId;
    this.appInterface = appInterface;
  }

  public async update(
    options: machine.types.UpdateOptions
  ): Promise<machine.types.ClientResponse> {
    const encodedAppState = this.appInterface.encode(options.state);
    const appStateHash = this.appInterface.stateHash(options.state);
    const updateData: machine.types.UpdateData = {
      encodedAppState,
      appStateHash
    };
    const message = {
      requestId: this.stateChannel.client.requestId(),
      appName: this.appName,
      appId: this.appId,
      action: machine.types.ActionName.UPDATE,
      data: updateData,
      multisigAddress: this.stateChannel.multisigAddress,
      fromAddress: this.stateChannel.fromAddress,
      toAddress: this.stateChannel.toAddress,
      stateChannel: undefined,
      seq: 0
    };
    return this.stateChannel.client.sendMessage(message);
  }

  public async uninstall(
    options: machine.types.UninstallOptions
  ): Promise<machine.types.ClientResponse> {
    const stateChannelInfo = await this.stateChannel.queryStateChannel();
    const freeBalance = stateChannelInfo.data.stateChannel.freeBalance;

    const uninstallData = {
      peerAmounts: [
        new machine.utils.PeerBalance(freeBalance.alice, options.peerABalance),
        new machine.utils.PeerBalance(freeBalance.bob, options.peerBBalance)
      ]
    };

    const message = {
      requestId: this.stateChannel.client.requestId(),
      appName: this.appName,
      appId: this.appId,
      action: machine.types.ActionName.UNINSTALL,
      data: uninstallData,
      multisigAddress: this.stateChannel.multisigAddress,
      fromAddress: this.stateChannel.fromAddress,
      toAddress: this.stateChannel.toAddress,
      stateChannel: undefined,
      seq: 0
    };
    return this.stateChannel.client.sendMessage(message);
  }
}
