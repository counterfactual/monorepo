import { INodeProvider, NodeMessage } from "@counterfactual/node-provider";

export class TestNodeProvider implements INodeProvider {
  public postedMessages: NodeMessage[] = [];
  readonly callbacks: ((message: NodeMessage) => void)[] = [];
  readonly messageListeners: {
    [index: number]: ((message: NodeMessage) => NodeMessage | undefined);
  } = {};

  public onMessage(callback: (message: NodeMessage) => void) {
    this.callbacks.push(callback);
  }

  public postMessage(message: NodeMessage) {
    this.postedMessages.push(message);
    const listener = this.messageListeners[this.postedMessages.length - 1];
    if (listener) {
      const response = listener(message);
      if (response !== undefined) {
        this.sendMessageFromNode(response);
      }
    }
  }

  public sendMessageFromNode(message: NodeMessage) {
    this.callbacks.forEach(cb => cb(message));
  }

  public listenForMessage(
    sequenceNum: number,
    callback: (m: NodeMessage) => NodeMessage | undefined
  ) {
    this.messageListeners[sequenceNum] = callback;
  }
}
