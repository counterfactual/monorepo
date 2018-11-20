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
        this.simulateMessageFromNode(response);
      }
    }
  }

  /**
   * Simulate sending a message from the node to the consumer of the node provider
   * @param message Message to send
   */
  public simulateMessageFromNode(message: NodeMessage) {
    this.callbacks.forEach(cb => cb(message));
  }

  /**
   * Listen for a message at a specific point in the sequence of messages. Optionally return a response message.
   * @param sequenceNum Which message to listen for e.g. "0" for the first message, "1" for the second message etc
   * @param callback Function that consumes a message.
   * If this function returns a message, it will be sent to the consumer of the node provider.
   */
  public listenForIncomingMessage(
    sequenceNum: number,
    callback: (m: NodeMessage) => NodeMessage | undefined
  ) {
    this.messageListeners[sequenceNum] = callback;
  }
}
