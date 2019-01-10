import { Node } from "./types";

interface INodeProvider {
  onMessage(callback: (message: Node.Message) => void): any;
  sendMessage(message: Node.Message): any;
}

export default class NodeProvider implements INodeProvider {
  /**
   * This boolean determines if the NodeProvider has received a MessagePort
   * via the `cf-node-provider:port` message.
   *
   * It is used to prevent attempts to send messages without an instance
   * of MessagePort stored locally.
   */
  private isConnected: boolean;
  private callback: (message: Node.Message) => void;

  constructor() {
    this.isConnected = false;
    this.callback = () => {};
  }

  public onMessage(callback: (message: Node.Message) => void) {
    console.log("NodeProvider#onMessage called with", callback);
    this.callback = callback;
  }

  public sendMessage(message) {
    if (!this.isConnected) {
      // We fail because we do not have a messagePort available.
      throw new Error(
        "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
      );
    }

    const appInstanceId = `app-instance-${new Date().valueOf()}`;
    switch (message.type) {
      case Node.MethodName.PROPOSE_INSTALL_VIRTUAL:
        this.sendCallback(
          {
            type: Node.MethodName.PROPOSE_INSTALL_VIRTUAL,
            result: { appInstanceId },
            requestId: message.requestId
          },
          100
        );

        // then emulate the other party installing...
        this.sendCallback(
          {
            type: Node.EventName.INSTALL,
            data: { appInstanceId }
          },
          200
        );
        break;
      case Node.MethodName.GET_APP_INSTANCE_DETAILS:
        this.sendCallback(
          {
            type: Node.MethodName.GET_APP_INSTANCE_DETAILS,
            result: { appInstance: { id: message.params.appInstanceId } },
            requestId: message.requestId
          },
          1
        );
        break;
      default:
        console.error("Unhandled message in MockNodeProvider:", message);
    }
  }

  private sendCallback(message: any, timeout: number) {
    setTimeout(() => {
      this.callback(message);
    }, timeout);
  }

  public async connect(): Promise<NodeProvider> {
    if (this.isConnected) {
      console.warn("NodeProvider is already connected.");
      return Promise.resolve(this);
    }

    return new Promise<NodeProvider>((resolve, reject) => {
      return setTimeout(() => {
        this.isConnected = true;
        return resolve(this);
      }, 1000);
    });
  }
}
