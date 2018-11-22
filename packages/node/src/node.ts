import * as cf from "@counterfactual/cf.js";
import {
  InstructionExecutor,
  InstructionExecutorConfig
} from "@counterfactual/machine";
import { ethers } from "ethers";
import { EventEmitter } from "events";

import { MultisigAddress, StateChannelInfo } from "./channel";

// TODO: to be passed into the Node constructor
export interface NodeOptions {
  networkContext?: cf.legacy.network.NetworkContext;
  signingService: ethers.Signer;
  // TODO: https://firebase.google.com/support/guides/firebase-web
  dbConnectionConfig?: any;
  // TODO: Specifies which network the Node is being initialized for.
  // The Node should be able to switch between networks while keeping its state
  // for any networks it has been operating in.
  networkID?: string;
}

/**
 * The Node class is the entry point to the @counterfactual/node package.
 * It's responsible for:
 * - encapsulating channels and their apps
 * - connecting with a provided database to persistently store commitments
 * - registering a signing service
 */
export class Node implements cf.legacy.node.ResponseSink {
  private channels: Map<MultisigAddress, StateChannelInfo> = new Map();

  // @ts-ignore
  private instructionExecutor: InstructionExecutor;
  constructor() {
    this.instructionExecutor = new InstructionExecutor(
      new InstructionExecutorConfig(this, Object.create(null), {})
    );
  }

  sendResponse(response: cf.legacy.node.Response) {
    console.log("sending response");
  }

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
   * Installs the given application into the channel specified by the multisig
   * address.
   * TODO: what's the spec being passed in for an app installation?
   * @return An EventEmitter which emits events for this app so that the
   * consumer can be notified of app updates
   */
  installApp(multisigAddress: string): EventEmitter {
    return new EventEmitter();
  }
  updateApp() {}
  uninstallApp() {}
}
