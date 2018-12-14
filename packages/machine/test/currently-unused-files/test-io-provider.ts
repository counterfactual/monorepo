import * as cf from "@counterfactual/cf.js";

import { Context } from "../../src/instruction-executor";

import { InternalMessage } from "../../src/types";

import { TestResponseSink } from "./test-response-sink";

type ClientActionMessageConsumer = (
  arg: cf.legacy.node.ClientActionMessage
) => void;

export class TestIOProvider {
  public messages: cf.legacy.node.ClientActionMessage[];

  public peers = new Map<string, TestResponseSink>();

  // when TestIOProvider::waitForIo is called without pending messages,
  // the returned promise's resolve function is captured and stored here
  private waitForIoContinuation?: ClientActionMessageConsumer;

  public ackMethod: Function = Object.create(null);

  private parent: TestResponseSink;

  constructor(parent: TestResponseSink) {
    this.messages = [];
    this.parent = parent;
  }

  public receiveMessageFromPeer(
    serializedMessage: cf.legacy.node.ClientActionMessage
  ) {
    const message = serializedMessage;

    if (this.waitForIoContinuation !== undefined) {
      this.waitForIoContinuation(message);
      // mark this.waitForIoContinuation as resolved
      this.waitForIoContinuation = undefined;
    } else if (!this.parent.active) {
      // if the parent test response sink is not running a protocol
      this.parent.active = true;
      this.ackMethod(message);
    } else {
      this.messages.push(message);
    }
  }

  public listenOnce(continuation: ClientActionMessageConsumer) {
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
    if (context.outbox.length === 0) {
      throw Error("ioSendMessage called with empty outbox");
    }
    for (const message of context.outbox) {
      const recipientAddr = message.toAddress;
      const recipient = this.peers.get(recipientAddr);
      if (recipient === undefined) {
        throw Error(`cannot route to ${recipientAddr}`);
      }
      recipient.receiveMessageFromPeer(message);
    }
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

    this.listenOnce(msg => {
      context.inbox.push(msg);
      resolve(msg);
    });

    return promise;
  }
}
