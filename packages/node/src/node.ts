import * as cf from "@counterfactual/cf.js";

import { EventEmitter } from "events";

import { MultisigAddress, StateChannelInfo } from "./channel";

export interface NodeOptions {
  channels?: Map<MultisigAddress, StateChannelInfo>;
}

/**
 * The Node class is the entry point to the @counterfactual/node package.
 * It's responsible for:
 * - encapsulating channels and their apps
 * - connecting with a provided database to persistently store commitments
 * - registering a signing service
 */
export class Node {
  private channels: Map<MultisigAddress, StateChannelInfo> = new Map();
  // TODO: the values need to be typed better, we're not storing AppDefinitions
  // but AppInstances that will eventually get installed into a channel
  private pendingInstallation: Map<string, cf.types.AppDefinition> = new Map();

  constructor(options: NodeOptions) {}

  // The following methods describe higher-level channel operations.

  /**
   * Given a channel, this adds said channel to the state of the Node if a
   * channel with the same multisig address does not exist.
   * @param channel The channel to keep track of.
   */
  openChannel(channel: StateChannelInfo): [boolean, string] {
    if (this.channels.has(channel.multisigAddress)) {
      return [
        false,
        `Channel with multisig address ${
          channel.multisigAddress
        } is already open`
      ];
    }
    this.channels.set(channel.multisigAddress, channel);
    return [true, ""];
  }

  /**
   * In the context of the Node, closing a channel means that the multisig's
   * funds have been removed, thus making the multisig useless. Hence, its entry
   * in this node's channels is erased.
   * @param multisigAddress
   */
  closeChannel(multisigAddress: string): [boolean, string] {
    if (this.channels.has(multisigAddress)) {
      this.channels.delete(multisigAddress);
      return [true, ""];
    }
    return [
      false,
      `Channel with multisig address ${multisigAddress} does not exist on this Node`
    ];
  }

  /**
   * Retrieve the list of channels that are open in this Node.
   * TODO: add auth token to retrieve only authorized channel(s)
   */
  getChannels(): Map<MultisigAddress, StateChannelInfo> {
    return this.channels;
  }

  // The following methods describe app-specific operations.

  /**
   * Proposes an installation of an app into the specified channel.
   * @param multisigAddress
   * @param appDefinition
   * @param proposeData
   * @return tuple of (appInstanceID, EventEmitter) so that the caller can
   * subscribe to events for the returned appInstanceID.
   */
  async proposeInstallApp(
    multisigAddress: string,
    appDefinition: string,
    proposeData: object
  ): Promise<[string, EventEmitter]> {
    // TODO: construct new AppInstance, wrap EventEmitter around it, add to pendingInstallations
    return ["appInstanceID", new EventEmitter()];
  }
  /**
   * This assumes a pending installation is present with the ID of the
   * AppInstance wanting to be installed.
   */
  async installApp(appId: string): Promise<[boolean, string]> {
    // TODO: retrive pending installation, add the AppInstance to the respective
    // channel, return success result of these operations
    return [true, ""];
  }
  updateApp() {}
  uninstallApp() {}
}
