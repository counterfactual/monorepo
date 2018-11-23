import * as cf from "@counterfactual/cf.js";
import { EventEmitter } from "events";
import * as _ from "lodash";

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

  // Maps AppInstanceIDs to the EventEmitters sending/receiving events for
  // the relevant AppInstance.
  private eventEmitters: Map<string, EventEmitter> = new Map();

  constructor(options: NodeOptions) {}

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

  /**
   * Returns all of the apps installed across all of the channels in the Node.
   */
  getApps(): cf.legacy.app.AppInstanceInfo[] {
    const apps: cf.legacy.app.AppInstanceInfo[] = [];
    this.channels.forEach(
      (channel: StateChannelInfo, multisigAddress: string) => {
        _.values(channel.appInstances).forEach(appInstance => {
          apps.push(appInstance);
        });
      }
    );
    return apps;
  }

  /**
   * Opens a connection specifically for this app with the consumer of this
   * node.
   * @returns An EventEmitter to emit events related to this app for consumers
   * subscribing to app updates.
   */
  openApp(appInstanceID: string): EventEmitter {
    const appInstanceEventEmitter = new EventEmitter();
    this.setupListeners(appInstanceEventEmitter);
    this.eventEmitters.set(appInstanceID, appInstanceEventEmitter);
    return appInstanceEventEmitter;
  }

  // The following methods are private.

  /**
   * Sets up listeners for relevant events for the given Emitter.
   * @param appInstanceEventEmitter
   */
  private setupListeners(appInstanceEventEmitter: EventEmitter) {
    appInstanceEventEmitter.on("proposeInstall", (proposeData: object) => {
      // TODO: add pending application to node and return AppInstanceID
    });

    appInstanceEventEmitter.on("install", (installData: object) => {
      // TODO: add application to node and return AppInstance
    });
  }
}
