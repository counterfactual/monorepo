import { INodeProvider, Node } from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

export default class NodeProvider implements INodeProvider {
  /**
   * This boolean determines if the NodeProvider has received a MessagePort
   * via the `cf-node-provider:port` message.
   *
   * It is used to prevent attempts to send messages without an instance
   * of MessagePort stored locally.
   */
  private isConnected: boolean;
  private eventEmitter: EventEmitter;
  private messagePort?: MessagePort;

  constructor() {
    this.isConnected = false;
    this.eventEmitter = new EventEmitter();
  }

  public onMessage(callback: (message: Node.Message) => void) {
    this.eventEmitter.on("message", callback);
  }

  public sendMessage(message: Node.Message) {
    if (!this.isConnected || !this.messagePort) {
      // We fail because we do not have a messagePort available.
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

    const context = window.parent || window;

    return new Promise<NodeProvider>((resolve, reject) => {
      window.addEventListener("message", event => {
        if (event.data === "cf-node-provider:port") {
          // This message is received from the Playground to connect it
          // to the dApp so they can exchange messages.
          this.startMessagePort(event);
          this.notifyNodeProviderIsConnected();
          resolve(this);
        }
      });

      context.postMessage("cf-node-provider:init", "*");
    });
  }

  private startMessagePort(event: MessageEvent) {
    this.messagePort = event.ports[0];
    this.messagePort.addEventListener("message", event => {
      // Every message received by the messagePort will be
      // relayed to whoever has subscribed to the "message"
      // event using `onMessage()`.
      this.eventEmitter.emit("message", event.data);
    });
    this.messagePort.start();
  }

  private notifyNodeProviderIsConnected() {
    window.postMessage("cf-node-provider:ready", "*");
    this.isConnected = true;
  }
}
