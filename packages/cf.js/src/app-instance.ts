import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo,
  BlockchainAsset
} from "@counterfactual/common-types";
import { BigNumber } from "ethers/utils";

export class AppInstance {
  readonly id: AppInstanceID;
  readonly appId: Address;
  readonly abiEncodings: AppABIEncodings;
  readonly asset: BlockchainAsset;
  readonly myDeposit: BigNumber;
  readonly peerDeposit: BigNumber;
  readonly timeout: BigNumber;

  constructor(info: AppInstanceInfo) {
    this.id = info.id;
    this.appId = info.appId;
    this.abiEncodings = info.abiEncodings;
    this.asset = info.asset;
    this.myDeposit = info.myDeposit;
    this.peerDeposit = info.peerDeposit;
    this.timeout = info.timeout;
  }
}
