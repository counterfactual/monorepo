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
    this.callback = callback;
  }

  public sendMessage(message: Node.Message) {
    if (!this.isConnected) {
      // We fail because we do not have a messagePort available.
      throw new Error(
        "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
      );
    }
    // console.log(message);
    switch (message.type) {
      case Node.MethodName.MATCHMAKE:
        const message = {
          type: Node.MethodName.MATCHMAKE,
          requestId: "123",
          params: {
            peerAddress: "0x123456",
            peerName: "Alice"
          }
        };
        this.sendCallback(message, 5000);
    }
  }

  private sendCallback(message: Node.Message, timeout: number) {
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
