import {
  AppInstanceInfo,
  AssetType,
  INodeProvider,
  Node
} from "@counterfactual/common-types";
import { BigNumber } from "ethers/utils";

export class TestNodeProvider implements INodeProvider {
  public postedMessages: Node.Message[] = [];
  readonly callbacks: ((message: Node.Message) => void)[] = [];

  public simulateMessageFromNode(message: Node.Message) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: Node.Message) => void) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: Node.Message) {
    this.postedMessages.push(message);
  }
}

export const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
  id: "TEST_ID",
  asset: { assetType: AssetType.ETH },
  abiEncodings: { actionEncoding: "", stateEncoding: "" },
  appId: "",
  myDeposit: new BigNumber("0"),
  peerDeposit: new BigNumber("0"),
  timeout: new BigNumber("0")
};
