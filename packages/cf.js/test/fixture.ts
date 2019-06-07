import { INodeProvider, Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";

import { jsonRpcMethodNames } from "../src/provider";

// Randomly generated
export const TEST_XPUBS = [
  "xpub6EAvo4pQADUK1nFB2UnC9nC5G9iDN3YaeVQ8vA77eU7GEjaZK8H5jDP8M89kJeajTqXJrfbKXgptCqtvpaG1ydED657Kj6dbfjYse6F7Uxy",
  "xpub6E7Ww5YRUry7BRUNAqyNGqR1A3AyaRP1dKy8adD5N5nniqkDJpibhspkiLzyhKe9o5TFnHpEhdtautQLqxahWQFCDCeQdBFmRwUiChfUXP4"
];

export class TestNodeProvider implements INodeProvider {
  public postedMessages: any[] = [];
  readonly callbacks: ((message: any) => void)[] = [];
  readonly messageEmitter: EventEmitter = new EventEmitter();

  public onMethodRequest(
    methodName: Node.MethodName,
    callback: (message: Node.MethodRequest) => void
  ) {
    this.messageEmitter.on(
      jsonRpcMethodNames[methodName] || methodName,
      callback
    );
  }

  public simulateMessageFromNode(message: any) {
    console.log("simulating message", message);
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: any) => void) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: any) {
    this.postedMessages.push(message);
    console.log("received message", message);
    this.messageEmitter.emit(message.methodName, message);
  }
}
