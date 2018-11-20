import {
  AppInterface,
  UninstallOptions,
  UpdateData,
  UpdateOptions
} from "./app";
import { Channel } from "./channel";
import { ActionName, ClientResponse } from "./node";
import { PeerBalance } from "./utils";

export class AppInstanceClient {
  public stateChannel: Channel;
  public appName: string;
  public appId: string;
  public appInterface: AppInterface;

  constructor(
    stateChannel: Channel,
    appName: string,
    appId: string,
    appInterface: AppInterface
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
      requestId: this.stateChannel.client.generateRequestId(),
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
    return this.stateChannel.client.sendMessage(message);
  }

  public async uninstall(options: UninstallOptions): Promise<ClientResponse> {
    const stateChannelInfo = await this.stateChannel.queryStateChannel();
    const freeBalance = stateChannelInfo.data.stateChannel.freeBalance;

    const uninstallData = {
      peerAmounts: [
        new PeerBalance(freeBalance.alice, options.peerABalance),
        new PeerBalance(freeBalance.bob, options.peerBBalance)
      ]
    };

    const message = {
      requestId: this.stateChannel.client.generateRequestId(),
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
    return this.stateChannel.client.sendMessage(message);
  }
}
