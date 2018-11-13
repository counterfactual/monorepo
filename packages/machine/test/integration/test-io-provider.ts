import * as cf from "@counterfactual/cf.js";

import { Context } from "../../src/instruction-executor";

import { InternalMessage } from "../../src/types";

import { TestResponseSink } from "./test-response-sink";

export class TestIOProvider {
  public messages: cf.node.ClientActionMessage[];

  // FIXME: Don't just initialize it as a null object
  // https://github.com/counterfactual/monorepo/issues/97
  public peer: TestResponseSink = Object.create(null);

  public listeners: {
    appId: string;
    multisig: string;
    seq: number;
    method: Function;
  }[];

  public ackMethod: Function = Object.create(null);

  constructor() {
    this.messages = [];
    this.listeners = [];
  }

  public receiveMessageFromPeer(
    serializedMessage: cf.node.ClientActionMessage
  ) {
    const message = cf.utils.serializer.deserialize(
      serializedMessage
    ) as cf.node.ClientActionMessage;

    let done = false;
    const executedListeners = [] as number[];
    let count = 0;

    // Invoke all listeners waiting for a response to resolve their promise
    this.listeners.forEach(listener => {
      if (
        listener.appId === message.appId ||
        (!listener.appId && listener.multisig === message.multisigAddress)
      ) {
        listener.method(message);
        done = true;
        executedListeners.push(count);
        count += 1;
      }
    });

    // Now remove all listeners we just invoked
    executedListeners.forEach(index => this.listeners.splice(index, 1));

    // initiate ack side if needed
    if (message.seq === 1) {
      this.ackMethod(message);
      done = true;
    }
    if (!done) {
      this.messages.push(message);
    }
  }

  public findMessage(
    multisig?: string,
    appId?: string
  ): cf.node.ClientActionMessage {
    let message: cf.node.ClientActionMessage;
    if (appId) {
      // FIXME: These shouldn't be ignored. Refactor for type safety.
      // https://github.com/counterfactual/monorepo/issues/96
      message = this.messages.find(m => m.appId === appId)!;
    } else {
      message = this.messages.find(m => m.multisigAddress === multisig)!;
    }
    return message;
  }

  public listenOnce(
    method: Function,
    multisig?: string,
    appId?: string,
    seq?: number
  ) {
    if (!multisig && !appId && !seq) {
      throw new Error("Must specify either a multisig or appId or sequence");
    }
    const message = this.findMessage(multisig, appId);
    if (!message) {
      // 🤮
      // @ts-ignore
      this.listeners.push({ appId, multisig, method, seq });
    } else {
      this.messages.splice(this.messages.indexOf(message), 1);
      method(message);
    }
  }

  public async ioSendMessage(
    internalMessage: InternalMessage,
    next: Function,
    context: Context
  ) {
    const value = context.intermediateResults.outbox!
    if (value === undefined) {
      throw Error("tried to send undefined message");
    }
    this.peer.receiveMessageFromPeer(value);
  }

  public async waitForIo(
    message: InternalMessage,
    next: Function
  ): Promise<cf.node.ClientActionMessage> {
    // Has websocket received a message for this appId/multisig
    // If yes, return the message, if not wait until it does
    let resolve: Function;
    const promise = new Promise<cf.node.ClientActionMessage>(
      r => (resolve = r)
    );

    // 🤮 listen for either multisig or appId depending on message.actionName
    let multisig: string = "";
    let appId: string = "";

    if (
      message.actionName === cf.node.ActionName.SETUP ||
      message.actionName === cf.node.ActionName.INSTALL
    ) {
      multisig = message.clientMessage.multisigAddress;
    } else {
      if (message.clientMessage.appId === undefined) {
        throw new Error(
          "messages other than setup and install must have appId set"
        );
      }
      appId = message.clientMessage.appId;
    }

    this.listenOnce(
      msg => {
        resolve(msg);
      },
      multisig,
      appId
    );
    return promise;
  }
}
