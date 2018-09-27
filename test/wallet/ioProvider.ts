import * as ethers from "ethers";

import { Instruction } from "../../src/instructions";
import { getLastResult } from "../../src/middleware/middleware";
import { deserialize } from "../../src/serializer";
import { Context } from "../../src/state";
import {
  ActionName,
  ClientActionMessage,
  InternalMessage
} from "../../src/types";
import { User } from "./user";
import { TestWallet } from "./wallet";

export class IoProvider {
  public messages: ClientActionMessage[];
  public user: User = Object.create(null);
  public peer: TestWallet = Object.create(null);
  public clientHandlesIO: Boolean;
  // TODO Refactor this into using an EventEmitter class so we don't do
  // this manually
  public listeners: Array<{
    appId: string;
    multisig: string;
    seq: number;
    method: Function;
  }>;

  /**
   * Called when receivng a message with seqno = 1.
   */
  public ackMethod: Function = Object.create(null);

  constructor(user) {
    // setup websockets
    this.user = user;
    this.messages = [];
    this.listeners = [];
    this.clientHandlesIO = false;
  }

  public receiveMessageFromPeer(message: ClientActionMessage) {
    message = deserialize(message) as ClientActionMessage;

    let done = false;
    const executedListeners = [] as number[];
    let count = 0;

    // invoke all listeners waiting for a response to resolve their promise
    this.listeners.forEach(listener => {
      if (
        listener.appId === message.appId ||
        (!listener.appId && listener.multisig === message.multisigAddress)
      ) {
        listener.method(message);
        done = true;
        executedListeners.push(count++);
      }
    });
    // now remove all listeners we just invoked
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

  public findMessage(multisig?: string, appId?: string): ClientActionMessage {
    let message: ClientActionMessage;
    if (appId) {
      // FIXME: these shouldn't be ignored. refactor for type safety
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
      // FIXME: (ts-strict) refactor for proper argument passing
      // @ts-ignore
      this.listeners.push({ appId, multisig, method, seq });
    } else {
      this.messages.splice(this.messages.indexOf(message), 1);
      method(message);
    }
  }

  public listen(
    method: Function,
    multisig?: string,
    appId?: string,
    seq?: number
  ) {
    this.ackMethod = method;
  }

  public setClientToHandleIO() {
    this.clientHandlesIO = true;
  }

  public async ioSendMessage(
    internalMessage: InternalMessage,
    next: Function,
    context: Context
  ) {
    const msg = getLastResult(Instruction.IO_PREPARE_SEND, context.results);
    // FIXME: (ts-strict) msg should never be null here
    const value = msg.value;

    if (this.clientHandlesIO) {
      this.user.sendIoMessageToClient(value);
    } else {
      // Hack for testing and demo purposes, full IO handling by client goes here
      this.peer.receiveMessageFromPeer(value);
    }
  }

  public async waitForIo(
    message: InternalMessage,
    next: Function
  ): Promise<ClientActionMessage> {
    // has websocket received a message for this appId/multisig
    // if yes, return the message, if not wait until it does
    let resolve: Function;
    const promise = new Promise<ClientActionMessage>(r => (resolve = r));

    let multisig: string = "";
    let appId: string = "";

    if (
      message.actionName === ActionName.SETUP ||
      message.actionName === ActionName.INSTALL
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
      message => {
        resolve(message);
      },
      multisig,
      appId
    );
    return promise;
  }

  private needsAppId(message: InternalMessage) {
    return message.actionName !== ActionName.SETUP;
  }
}
