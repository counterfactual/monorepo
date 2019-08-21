import { IRpcNodeProvider, Node } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import EventEmitter from "eventemitter3";
import { JsonRpcNotification, JsonRpcResponse, Rpc } from "rpc-server";

// Randomly generated
export const TEST_XPUBS = [
  "xpub6EAvo4pQADUK1nFB2UnC9nC5G9iDN3YaeVQ8vA77eU7GEjaZK8H5jDP8M89kJeajTqXJrfbKXgptCqtvpaG1ydED657Kj6dbfjYse6F7Uxy",
  "xpub6E7Ww5YRUry7BRUNAqyNGqR1A3AyaRP1dKy8adD5N5nniqkDJpibhspkiLzyhKe9o5TFnHpEhdtautQLqxahWQFCDCeQdBFmRwUiChfUXP4"
];

/**
 * We use 0x00...000 to represent an identifier for the ETH token
 * in places where values are indexed on token address. Of course,
 * in practice, there is no "token address" for ETH because it is a
 * native asset on the ethereum blockchain, but using this as an index
 * is convenient for storing this data in the same data structure that
 * also carries data about ERC20 tokens.
 */
export const CONVENTION_FOR_ETH_TOKEN_ADDRESS = AddressZero;

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
