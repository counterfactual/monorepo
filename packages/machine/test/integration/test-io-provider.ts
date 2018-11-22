import * as cf from "@counterfactual/cf.js";

import { Context } from "../../src/instruction-executor";

import { InternalMessage } from "../../src/types";

import { TestResponseSink } from "./test-response-sink";

type ClientActionMessageConsumer = (arg: cf.legacy.node.ClientActionMessage) => void;

export class TestIOProvider {
  public messages: cf.legacy.node.ClientActionMessage[];

  // FIXME: Don't just initialize it as a null object
  // https://github.com/counterfactual/monorepo/issues/97
  public peer: TestResponseSink = Object.create(null);

  // when TestIOProvider::waitForIo is called without pending messages,
  // the returned promise's resolve function is captured and stored here
  private waitForIoContinuation?: ClientActionMessageConsumer;

  public ackMethod: Function = Object.create(null);

  constructor() {
    this.messages = [];
  }

  public receiveMessageFromPeer(
    serializedMessage: cf.legacy.node.ClientActionMessage
  ) {
    const message = cf.legacy.utils.serializer.deserialize(
      serializedMessage
    ) as cf.legacy.node.ClientActionMessage;

    if (this.waitForIoContinuation !== undefined) {
      this.waitForIoContinuation(message);
      // mark this.waitForIoContinuation as resolved
      this.waitForIoContinuation = undefined;
    } else if (message.seq === 1) {
      // initiate ack side if needed
      this.ackMethod(message);
    } else {
      this.messages.push(message);
    }

  }

  public listenOnce(
    continuation: ClientActionMessageConsumer,
  ) {

    const message = this.messages.pop();

    if (message !== undefined) {
      continuation(message);
    } else {
      this.waitForIoContinuation = continuation;
    }
  }

  public async ioSendMessage(
    internalMessage: InternalMessage,
    next: Function,
    context: Context
  ) {
    const value = context.intermediateResults.outbox!
    if (value === undefined) {
      throw Error("ioSendMessage cannot send message with value undefined");
    }
    this.peer.receiveMessageFromPeer(value);
  }

  public async waitForIo(
    message: InternalMessage,
    next: Function,
    context: Context
  ): Promise<cf.legacy.node.ClientActionMessage> {

    let resolve: ClientActionMessageConsumer;
    const promise = new Promise<cf.legacy.node.ClientActionMessage>(
      r => (resolve = r)
    );

    this.listenOnce(
      msg => {
        context.intermediateResults.inbox = msg;
        resolve(msg);
      },
    );
    return promise;
  }
}
