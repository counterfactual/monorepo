import { INodeProvider, Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";

// Randomly generated
export const TEST_XPUBS = [
  "xpub6EAvo4pQADUK1nFB2UnC9nC5G9iDN3YaeVQ8vA77eU7GEjaZK8H5jDP8M89kJeajTqXJrfbKXgptCqtvpaG1ydED657Kj6dbfjYse6F7Uxy",
  "xpub6E7Ww5YRUry7BRUNAqyNGqR1A3AyaRP1dKy8adD5N5nniqkDJpibhspkiLzyhKe9o5TFnHpEhdtautQLqxahWQFCDCeQdBFmRwUiChfUXP4"
];

export class TestNodeProvider implements INodeProvider {
  public postedMessages: Node.Message[] = [];
  readonly callbacks: ((message: Node.Message) => void)[] = [];
  readonly messageEmitter: EventEmitter = new EventEmitter();

  public onMethodRequest(
    methodName: Node.MethodName,
    callback: (message: Node.MethodRequest) => void
  ) {
    this.messageEmitter.on(methodName, callback);
  }

  public simulateMessageFromNode(message: Node.Message) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: Node.Message) => void) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: Node.Message) {
    this.postedMessages.push(message);
    this.messageEmitter.emit(message.type, message);
  }
}
