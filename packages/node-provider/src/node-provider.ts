import EventEmitter from "eventemitter3";

import {
  INodeProvider,
  NodeMessage,
  NodeMessageReceivedCallback
} from "./types";

export default class NodeProvider implements INodeProvider {
  private isConnected: boolean;
  private eventEmitter: EventEmitter;
  private messagePort?: MessagePort;

  constructor() {
    this.isConnected = false;
    this.eventEmitter = new EventEmitter();
  }

  public onMessage(callback: NodeMessageReceivedCallback) {
    this.eventEmitter.on("message", callback);
  }

  public sendMessage(message: NodeMessage) {
    if (!this.isConnected || !this.messagePort) {
      throw new Error(
        "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
      );
    }

    this.messagePort.postMessage(message);
  }

  public async connect(): Promise<NodeProvider> {
    if (this.isConnected) {
      console.warn("NodeProvider is already connected.");
      return Promise.resolve(this);
    }

    return new Promise<NodeProvider>(this.getMessagePort.bind(this));
  }

  private getMessagePort(resolve, reject) {
    window.addEventListener("message", event => {
      if (event.data === "cf-node-provider:port") {
        this.startMessagePort(event);
        this.notifyNodeProviderIsConnected();
        resolve(this);
      }
    });

    window.postMessage("cf-node-provider:init", "*");
  }

  private startMessagePort(event: MessageEvent) {
    this.messagePort = event.ports[0];
    this.messagePort.addEventListener("message", event => {
      this.eventEmitter.emit("message", event.data);
    });
    this.messagePort.start();
  }

  private notifyNodeProviderIsConnected() {
    window.postMessage("cf-node-provider:ready", "*");
    this.isConnected = true;
  }
}
