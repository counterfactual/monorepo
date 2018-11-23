import * as cf from "@counterfactual/cf.js";
import { EventEmitter } from "events";
import * as _ from "lodash";

import { MultisigAddress, StateChannelInfo } from "./channel";

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
