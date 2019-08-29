declare var ethereum: EthereumGlobal;

import { IRpcNodeProvider, Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";
import { JsonRpcNotification, JsonRpcResponse, Rpc } from "rpc-server";

import { EthereumGlobal } from "./types";

export default class NodeProviderEthereum implements IRpcNodeProvider {
  private readonly eventEmitter: EventEmitter;
  private isConnected: boolean;
  private debugMode: string = "none";
  private debugEmitter: (
    source: string,
    message: string,
    data?: any
  ) => void = _ => {};

  constructor() {
    this.isConnected = false;
    this.eventEmitter = new EventEmitter();

    this.detectDebugMode();
  }

  private detectDebugMode() {
    try {
      if (process && process.env.CF_NODE_PROVIDER_DEBUG) {
        this.debugMode = "shell";
        this.debugEmitter = (source: string, message: string, data?: any) => {
          console.log(`[NodeProvider] ${source}(): ${message}`);
          if (data) {
            console.log("   ", data);
          }
        };
      }
    } catch {
      try {
        if (window.localStorage.getItem("cf:node-provider:debug") === "true") {
          this.debugMode = "browser";
          this.debugEmitter = (source: string, message: string, data?: any) => {
            console.log(
              ["%c[NodeProvider]", `%c#${source}()`, `%c${message}`].join(" "),
              "color: gray;",
              "color: green;",
              "color: black;"
            );

            if (data) {
              console.log("   ", data);
            }
          };
        }
      } catch {
        // Fallback to allow debugging without Local Storage flag.
        if (window.location.href.includes("#cf:node-provider:debug")) {
          this.debugMode = "browser";
          this.debugEmitter = (source: string, message: string, data?: any) => {
            console.log(
              ["%c[NodeProvider]", `%c#${source}()`, `%c${message}`].join(" "),
              "color: gray;",
              "color: green;",
              "color: black;"
            );

            if (data) {
              console.log("   ", data);
            }
          };
        }
      }
    }
  }

  private log(source: string, message: string, data?: any) {
    if (this.debugMode === "none") {
      return;
    }

    this.debugEmitter(source, message, data);
  }

  public onMessage(
    callback: (message: JsonRpcNotification | JsonRpcResponse) => void
  ) {
    this.log(
      "onMessage",
      "Registered listener for eventEmitter#message",
      callback.toString()
    );

    this.eventEmitter.on("message", callback);
  }

  public sendMessage(message: Rpc) {
    if (!this.isConnected) {
      // We fail because we aren't connected.
      throw new Error(
        "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
      );
    }

    ethereum
      .send("counterfactual:nodeProvider:request", [message])
      .then(({ result }: { result: Node.Message }) => {
        this.eventEmitter.emit("message", result);
      });

    this.log(
      "sendMessage",
      "Message has been posted via messagePort",
      JSON.stringify(message)
    );
  }

  public async connect(): Promise<NodeProviderEthereum> {
    if (this.isConnected) {
      console.warn("NodeProvider is already connected.");
      return Promise.resolve(this);
    }

    this.startEthereumEventListeners();
    this.notifyNodeProviderIsConnected();

    return Promise.resolve(this);
  }

  private startEthereumEventListeners() {
    // TODO: Get these names from a shared package for DRY purposes.
    const NODE_EVENTS = [
      "proposeInstallVirtual",
      "installVirtualEvent",
      "getAppInstanceDetails",
      "getState",
      "takeAction",
      "updateStateEvent",
      "uninstallEvent"
    ];
    NODE_EVENTS.forEach((event: string) => {
      this.startIndividualEthereumEventListener(event);
    });
  }

  startIndividualEthereumEventListener(event: string) {
    ethereum
      .send("counterfactual:nodeProvider:event", [event])
      .then(({ result }: { result: Node.Message }) => {
        this.eventEmitter.emit("message", result);
        this.startIndividualEthereumEventListener(event);
      });
  }

  private notifyNodeProviderIsConnected() {
    this.isConnected = true;
    this.log("notifyNodeProviderIsConnected", "Connection successful");
  }
}
