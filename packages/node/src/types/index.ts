import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo,
  AppState,
  BlockchainAsset
} from "@counterfactual/types";
import { BigNumber, bigNumberify } from "ethers/utils";

export interface IProposedAppInstanceInfo {
  id?: AppInstanceID;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  initialState: AppState;
}

export interface ProposedAppInstanceInfoJSON {
  id: AppInstanceID;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: string;
  peerDeposit: string;
  timeout: string;
  initialState: AppState;
}

export class ProposedAppInstanceInfo implements AppInstanceInfo {
  id: AppInstanceID;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  initialState: AppState;
  constructor(
    clientAppInstanceId: string,
    proposeParams: IProposedAppInstanceInfo
  ) {
    this.id = clientAppInstanceId;
    this.appId = proposeParams.appId;
    this.abiEncodings = proposeParams.abiEncodings;
    this.asset = proposeParams.asset;
    this.myDeposit = proposeParams.myDeposit;
    this.peerDeposit = proposeParams.peerDeposit;
    this.timeout = proposeParams.timeout;
    this.initialState = proposeParams.initialState;
  }

  toJson() {
    return {
      id: this.id,
      appId: this.appId,
      abiEncodings: this.abiEncodings,
      asset: this.asset,
      myDeposit: this.myDeposit.toString(),
      peerDeposit: this.peerDeposit.toString(),
      timeout: this.timeout.toString(),
      initialState: this.initialState
    };
  }

  static fromJson(json: ProposedAppInstanceInfoJSON): ProposedAppInstanceInfo {
    const proposeParams: IProposedAppInstanceInfo = {
      id: json.id,
      appId: json.appId,
      abiEncodings: json.abiEncodings,
      asset: json.asset,
      myDeposit: bigNumberify(json.myDeposit),
      peerDeposit: bigNumberify(json.peerDeposit),
      timeout: bigNumberify(json.timeout),
      initialState: json.initialState
    };
    return new ProposedAppInstanceInfo(json.id, proposeParams);
  }
}
