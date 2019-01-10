import { INodeProvider, Node } from "@counterfactual/types";
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
  private debugMode: string = "none";
  private debugEmitter: (
    source: string,
    message: string,
    data?: any
  ) => void = _ => {};

  constructor() {
    this.isConnected = false;
    this.eventEmitter = new EventEmitter();

    if (process && process.env.CF_NODE_PROVIDER_DEBUG) {
      this.debugMode = "shell";
      this.debugEmitter = (source: string, message: string, data?: any) => {
        console.log(`[NodeProvider] ${source}(): ${message}`);
        if (data) {
          console.log("   ", data);
        }
      };
    } else if (
      window.localStorage.getItem("cf:node-provider:debug") === "true"
    ) {
      this.debugMode = "browser";
      this.debugEmitter = (source: string, message: string, data?: any) => {
        console.log(
          ["%c[NodeProvider]", `%c#${source}()`, message].join(" "),
          "color: gray;",
          "color: green;"
        );

        if (data) {
          console.log("   ", data);
        }
      };
    }
  }

  private log(source: string, message: string, data?: any) {
    if (this.debugMode === "none") {
      return;
    }

    this.debugEmitter(source, message, data);
  }

  public onMessage(callback: (message: Node.Message) => void) {
    this.log(
      "onMessage",
      "Registered listener for eventEmitter#message",
      callback.toString()
    );

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
    this.log(
      "sendMessage",
      "Message has been posted via messagePort",
      JSON.stringify(message)
    );
  }

  public async connect(): Promise<NodeProvider> {
    if (this.isConnected) {
      console.warn("NodeProvider is already connected.");
      return Promise.resolve(this);
    }

    const context = window.parent || window;

    this.log("connect", "Attempting to connect");

    return new Promise<NodeProvider>((resolve, reject) => {
      window.addEventListener("message", event => {
        if (event.data === "cf-node-provider:port") {
          this.log(
            "connect",
            "Received message via window.onMessage event",
            "cf-node-provider-port"
          );

          // This message is received from the Playground to connect it
          // to the dApp so they can exchange messages.
          this.startMessagePort(event);
          this.notifyNodeProviderIsConnected();
          resolve(this);
        }
      });

      context.postMessage("cf-node-provider:init", "*");
      this.log(
        "connect",
        "used window.postMessage() to send",
        "cf-node-provider:init"
      );
    });
  }

  private startMessagePort(event: MessageEvent) {
    this.messagePort = event.ports[0];
    this.messagePort.addEventListener("message", event => {
      // Every message received by the messagePort will be
      // relayed to whoever has subscribed to the "message"
      // event using `onMessage()`.
      this.log(
        "messagePort#onMessage",
        "messagePort has received a message",
        event.data
      );
      this.eventEmitter.emit("message", event.data);
    });
    this.messagePort.start();

    this.log("startMessagePort", "messagePort has started");
  }

  private notifyNodeProviderIsConnected() {
    window.postMessage("cf-node-provider:ready", "*");
    this.log(
      "notifyNodeProviderIsConnected",
      "used window.postMessage() to send:",
      "cf-node-provider:ready"
    );
    this.isConnected = true;
    this.log("notifyNodeProviderIsConnected", "Connection successful");
  }
}
