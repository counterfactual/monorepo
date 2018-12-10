import {
  AppInstanceInfo,
  AssetType,
  INodeProvider,
  Node
} from "@counterfactual/common-types";
import { BigNumber } from "ethers/utils";
import EventEmitter from "eventemitter3";

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

export const TEST_APP = {
  abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
  appId: "0x1515151515151515151515151515151515151515"
};

export const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
  id: "TEST_ID",
  asset: { assetType: AssetType.ETH },
  abiEncodings: TEST_APP.abiEncodings,
  appId: TEST_APP.appId,
  myDeposit: new BigNumber("0"),
  peerDeposit: new BigNumber("0"),
  timeout: new BigNumber("0")
};
