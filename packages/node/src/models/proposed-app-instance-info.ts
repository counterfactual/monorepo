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
  initiatingAddress: Address;
  respondingAddress: Address;
  intermediaries?: Address[];
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
  initiatingAddress: Address;
  respondingAddress: Address;
  intermediaries?: Address[];
}

/**
 * The @counterfactual/cf.js package has a concept of an `AppInstanceInfo`:
 * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-type-appinstanceinfo.
 * This is a simplified, client-side representation of what the @counterfactual/machine package calls an `AppInstance`.
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
  initiatingAddress: Address;
  respondingAddress: Address;
  intermediaries?: Address[];

  constructor(
    appInstanceId: AppInstanceID,
    proposeParams: IProposedAppInstanceInfo
  ) {
    this.id = appInstanceId;
    this.appId = proposeParams.appId;
    this.abiEncodings = proposeParams.abiEncodings;
    this.asset = proposeParams.asset;
    this.myDeposit = proposeParams.myDeposit;
    this.peerDeposit = proposeParams.peerDeposit;
    this.timeout = proposeParams.timeout;
    this.initialState = proposeParams.initialState;
    this.initiatingAddress = proposeParams.initiatingAddress;
    this.respondingAddress = proposeParams.respondingAddress;
    if (proposeParams.intermediaries) {
      this.intermediaries = proposeParams.intermediaries;
    }
  }

  toJson() {
    let json;
    json = {
      id: this.id,
      appId: this.appId,
      abiEncodings: this.abiEncodings,
      asset: this.asset,
      myDeposit: this.myDeposit,
      peerDeposit: this.peerDeposit,
      timeout: this.timeout,
      initialState: this.initialState,
      initiatingAddress: this.initiatingAddress,
      respondingAddress: this.respondingAddress
    };
    if (this.intermediaries) {
      json.intermediaries = this.intermediaries;
    }
    return json;
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
      initialState: json.initialState,
      initiatingAddress: json.initiatingAddress,
      respondingAddress: json.respondingAddress,
      intermediaries: json.intermediaries
    };
    return new ProposedAppInstanceInfo(json.id, proposeParams);
  }
}
