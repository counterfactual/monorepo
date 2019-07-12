import { IRpcNodeProvider, Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";
import { JsonRpcNotification, JsonRpcResponse, Rpc } from "rpc-server";

// Randomly generated
export const TEST_XPUBS = [
  "xpub6EAvo4pQADUK1nFB2UnC9nC5G9iDN3YaeVQ8vA77eU7GEjaZK8H5jDP8M89kJeajTqXJrfbKXgptCqtvpaG1ydED657Kj6dbfjYse6F7Uxy",
  "xpub6E7Ww5YRUry7BRUNAqyNGqR1A3AyaRP1dKy8adD5N5nniqkDJpibhspkiLzyhKe9o5TFnHpEhdtautQLqxahWQFCDCeQdBFmRwUiChfUXP4"
];

// Randomly generated
export const TEST_OWNERS = [
  "0x9aF5D0dcABc31B1d80639ac3042b2aD754f072FE",
  "0x54601F103dD6AE110aEf7F9007670f593d24a6ac"
];

export class TestNodeProvider implements IRpcNodeProvider {
  public postedMessages: Rpc[] = [];
  readonly callbacks: ((
    message: JsonRpcResponse | JsonRpcNotification
  ) => void)[] = [];
  readonly messageEmitter: EventEmitter = new EventEmitter();

  public onMethodRequest(
    methodName: Node.RpcMethodName,
    callback: (message: Rpc) => void
  ) {
    this.messageEmitter.on(methodName, callback);
  }

  public simulateMessageFromNode(
    message: JsonRpcResponse | JsonRpcNotification
  ) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(
    callback: (message: JsonRpcResponse | JsonRpcNotification) => void
  ) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: Rpc) {
    this.postedMessages.push(message);
    this.messageEmitter.emit(message.methodName, message);
  }
}
