import {
  Address,
  AppABIEncodings,
  AppAction,
  AppInstanceID,
  AppInstanceInfo,
  AppState,
  BlockchainAsset,
  Node
} from "@counterfactual/common-types";
import { BigNumber } from "ethers/utils";

import { Provider } from "./provider";

interface Payouts {
  myPayout: BigNumber;
  peerPayout: BigNumber;
}

export class AppInstance {
  readonly id: AppInstanceID;
  readonly appId: Address;
  readonly abiEncodings: AppABIEncodings;
  readonly asset: BlockchainAsset;
  readonly myDeposit: BigNumber;
  readonly peerDeposit: BigNumber;
  readonly timeout: BigNumber;

  constructor(info: AppInstanceInfo, readonly provider: Provider) {
    this.id = info.id;
    this.appId = info.appId;
    this.abiEncodings = info.abiEncodings;
    this.asset = info.asset;
    this.myDeposit = info.myDeposit;
    this.peerDeposit = info.peerDeposit;
    this.timeout = info.timeout;
  }

  async getState(): Promise<AppState> {
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.GET_STATE,
      {
        appInstanceId: this.id
      }
    );
    const result = response.result as Node.GetStateResult;
    return result.state;
  }

  async takeAction(action: AppAction): Promise<AppState> {
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.TAKE_ACTION,
      {
        action,
        appInstanceId: this.id
      }
    );
    const result = response.result as Node.TakeActionResult;
    return result.newState;
  }

  async uninstall(): Promise<Payouts> {
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.UNINSTALL,
      {
        appInstanceId: this.id
      }
    );
    const { myPayout, peerPayout } = response.result as Node.UninstallResult;
    return { myPayout, peerPayout };
  }
}
