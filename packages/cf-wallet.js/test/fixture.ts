import { JsonApiINodeProvider, Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";

// Randomly generated
export const TEST_XPUBS = [
  "xpub6EAvo4pQADUK1nFB2UnC9nC5G9iDN3YaeVQ8vA77eU7GEjaZK8H5jDP8M89kJeajTqXJrfbKXgptCqtvpaG1ydED657Kj6dbfjYse6F7Uxy",
  "xpub6E7Ww5YRUry7BRUNAqyNGqR1A3AyaRP1dKy8adD5N5nniqkDJpibhspkiLzyhKe9o5TFnHpEhdtautQLqxahWQFCDCeQdBFmRwUiChfUXP4"
];

export class TestNodeProvider implements JsonApiINodeProvider {
  public postedMessages: (Node.JsonApiDocument)[] = [];
  readonly callbacks: ((message: Node.JsonApiDocument) => void)[] = [];
  readonly messageEmitter: EventEmitter = new EventEmitter();

  public onMethodRequest(
    methodName: Node.MethodName,
    callback: (message: Node.JsonApiDocument) => void
  ) {
    this.messageEmitter.on(methodName, callback);
  }

  public simulateMessageFromNode(message: Node.JsonApiDocument) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: Node.JsonApiDocument) => void) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: Node.JsonApiDocument) {
    this.postedMessages.push(message);
    this.messageEmitter.emit(message.ref.type, message);
  }
}
