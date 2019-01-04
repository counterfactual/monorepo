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

/**
 * The @counterfactual/cf.js package has a concept of an `AppInstanceInfo`: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-type-appinstanceinfo.
 * This is a simplified, front-end representation of what the @counterfactual/machine package calls an `AppInstance`.
 *
 * When an `AppInstanceInfo` is proposed to be installed by a client running the `cf.js`
 * package, the Node receives some state indicating the parameters of the proposal.
 * This class captures said state for the duration of the proposal being made and
 * the respecting `AppInstance` is installed.
 */
export class ProposedAppInstanceInfo implements AppInstanceInfo {
  id: AppInstanceID;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  initialState: AppState;
  constructor(appInstanceId: string, proposeParams: IProposedAppInstanceInfo) {
    this.id = appInstanceId;
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
