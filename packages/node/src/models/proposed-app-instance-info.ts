import {
  AppABIEncodings,
  OutcomeType,
  SolidityValueType
} from "@counterfactual/types";
import { BigNumber, bigNumberify, BigNumberish } from "ethers/utils";

import { AppInstance } from "./app-instance";
import { StateChannel } from "./state-channel";

export interface IAppInstanceProposal {
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  initiatorDeposit: BigNumberish;
  initiatorDepositTokenAddress: string;
  responderDeposit: BigNumberish;
  responderDepositTokenAddress: string;
  timeout: BigNumberish;
  initialState: SolidityValueType;
  appSeqNo?: number;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaryIdentifier?: string;
  outcomeType: OutcomeType;
}

export interface AppInstanceProposalJSON {
  identityHash: string;
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  initiatorDeposit: { _hex: string };
  initiatorDepositTokenAddress: string;
  responderDeposit: { _hex: string };
  responderDepositTokenAddress: string;
  timeout: { _hex: string };
  initialState: SolidityValueType;
  appSeqNo: number;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaryIdentifier?: string;
  outcomeType: OutcomeType;
}

/**
 * The @counterfactual/cf.js package has a concept of an `AppInstanceInfo`:
 * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-type-appinstanceinfo.
 * This is a simplified, client-side representation of what the machine calls an `AppInstance`.
 *
 * When an `AppInstanceInfo` is proposed to be installed by a client running the `cf.js`
 * package, the Node receives some state indicating the parameters of the proposal.
 * This class captures said state for the duration of the proposal being made and
 * the respecting `AppInstance` is installed.
 */
export class AppInstanceProposal {
  identityHash: string;
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  initiatorDeposit: BigNumber;
  initiatorDepositTokenAddress: string;
  responderDeposit: BigNumber;
  responderDepositTokenAddress: string;
  timeout: BigNumber;
  initialState: SolidityValueType;
  appSeqNo: number;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaryIdentifier?: string;
  outcomeType: OutcomeType;

  constructor(
    proposeParams: IAppInstanceProposal,
    channel?: StateChannel,
    overrideId?: string
  ) {
    this.appDefinition = proposeParams.appDefinition;
    this.abiEncodings = proposeParams.abiEncodings;
    this.initiatorDeposit = bigNumberify(proposeParams.initiatorDeposit);
    this.initiatorDepositTokenAddress =
      proposeParams.initiatorDepositTokenAddress;
    this.responderDeposit = bigNumberify(proposeParams.responderDeposit);
    this.responderDepositTokenAddress =
      proposeParams.responderDepositTokenAddress;
    this.timeout = bigNumberify(proposeParams.timeout);
    this.proposedByIdentifier = proposeParams.proposedByIdentifier;
    this.proposedToIdentifier = proposeParams.proposedToIdentifier;
    this.initialState = proposeParams.initialState;
    this.appSeqNo =
      proposeParams.appSeqNo || (channel ? channel.numProposedApps : 0);
    this.intermediaryIdentifier = proposeParams.intermediaryIdentifier;
    this.outcomeType = proposeParams.outcomeType;
    this.identityHash = overrideId || this.getIdentityHashFor(channel!);
  }

  getIdentityHashFor(stateChannel: StateChannel) {
    return this.toAppInstanceFor(stateChannel).identityHash;
  }

  toAppInstanceFor(stateChannel: StateChannel) {
    return new AppInstance(
      stateChannel.getSigningKeysFor(this.appSeqNo),
      bigNumberify(this.timeout).toNumber(),
      {
        addr: this.appDefinition,
        ...this.abiEncodings
      },
      (this.intermediaryIdentifier || []).length > 0,
      this.appSeqNo,
      this.initialState,
      0,
      bigNumberify(this.timeout).toNumber(),
      // the below two arguments are not currently used in app identity
      // computation
      ("" as unknown) as OutcomeType,
      undefined,
      // this is not relevant here as it gets set properly later in the context
      // of the channel during an install, and it's not used to calculate
      // the AppInstance ID so there won't be a possible mismatch between
      // a proposed AppInstance ID and an installed AppInstance ID
      undefined,
      undefined
    );
  }

  toJson(): AppInstanceProposalJSON {
    return {
      identityHash: this.identityHash,
      appDefinition: this.appDefinition,
      abiEncodings: this.abiEncodings,
      initiatorDeposit: { _hex: this.initiatorDeposit.toHexString() },
      initiatorDepositTokenAddress: this.initiatorDepositTokenAddress,
      responderDeposit: { _hex: this.responderDeposit.toHexString() },
      responderDepositTokenAddress: this.responderDepositTokenAddress,
      initialState: this.initialState,
      appSeqNo: this.appSeqNo,
      timeout: { _hex: this.timeout.toHexString() },
      proposedByIdentifier: this.proposedByIdentifier,
      proposedToIdentifier: this.proposedToIdentifier,
      intermediaryIdentifier: this.intermediaryIdentifier,
      outcomeType: this.outcomeType
    };
  }

  static fromJson(json: AppInstanceProposalJSON): AppInstanceProposal {
    const proposeParams = {
      appDefinition: json.appDefinition,
      abiEncodings: json.abiEncodings,
      initiatorDeposit: bigNumberify(json.initiatorDeposit._hex),
      initiatorDepositTokenAddress: json.initiatorDepositTokenAddress,
      responderDeposit: bigNumberify(json.responderDeposit._hex),
      responderDepositTokenAddress: json.responderDepositTokenAddress,
      timeout: bigNumberify(json.timeout._hex),
      initialState: json.initialState,
      appSeqNo: json.appSeqNo,
      proposedByIdentifier: json.proposedByIdentifier,
      proposedToIdentifier: json.proposedToIdentifier,
      intermediaryIdentifier: json.intermediaryIdentifier,
      outcomeType: json.outcomeType
    };

    return new AppInstanceProposal(proposeParams, undefined, json.identityHash);
  }
}
