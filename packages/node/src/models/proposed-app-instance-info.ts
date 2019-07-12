import {
  AppABIEncodings,
  AppInterface,
  OutcomeType,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { BigNumber, bigNumberify, BigNumberish } from "ethers/utils";

import { xkeyKthAddress, xkeysToSortedKthAddresses } from "../machine";
import { AppInstance, StateChannel } from "../models";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "./free-balance";

export interface IAppInstanceProposal {
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  timeout: BigNumberish;
  initialState: SolidityABIEncoderV2Type;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaries?: string[];
  outcomeType: OutcomeType;
}

export interface AppInstanceProposalJSON {
  identityHash: string;
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  myDeposit: { _hex: string };
  peerDeposit: { _hex: string };
  timeout: { _hex: string };
  initialState: SolidityABIEncoderV2Type;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaries?: string[];
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
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  initialState: SolidityABIEncoderV2Type;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaries?: string[];
  outcomeType: OutcomeType;

  constructor(
    proposeParams: IAppInstanceProposal,
    channel?: StateChannel,
    overrideId?: string
  ) {
    this.appDefinition = proposeParams.appDefinition;
    this.abiEncodings = proposeParams.abiEncodings;
    this.myDeposit = bigNumberify(proposeParams.myDeposit);
    this.peerDeposit = bigNumberify(proposeParams.peerDeposit);
    this.timeout = bigNumberify(proposeParams.timeout);
    this.proposedByIdentifier = proposeParams.proposedByIdentifier;
    this.proposedToIdentifier = proposeParams.proposedToIdentifier;
    this.initialState = proposeParams.initialState;
    this.intermediaries = proposeParams.intermediaries;
    this.outcomeType = proposeParams.outcomeType;
    this.identityHash = overrideId || this.getIdentityHashFor(channel!);
  }

  // TODO: Note the construction of this is duplicated from the machine
  getIdentityHashFor(stateChannel: StateChannel) {
    const proposedAppInterface: AppInterface = {
      addr: this.appDefinition,
      ...this.abiEncodings
    };

    let signingKeys: string[];
    let isVirtualApp: boolean;

    if ((this.intermediaries || []).length > 0) {
      isVirtualApp = true;

      const appSeqNo = stateChannel.numInstalledApps;

      const [intermediaryXpub] = this.intermediaries!;

      // https://github.com/counterfactual/specs/blob/master/09-install-virtual-app-protocol.md#derived-fields
      signingKeys = [xkeyKthAddress(intermediaryXpub, appSeqNo)].concat(
        xkeysToSortedKthAddresses(
          [this.proposedByIdentifier, this.proposedToIdentifier],
          appSeqNo
        )
      );
    } else {
      isVirtualApp = false;
      signingKeys = stateChannel.getNextSigningKeys();
    }

    const owner = isVirtualApp ? AddressZero : stateChannel.multisigAddress;

    const proposedAppInstance = new AppInstance(
      owner,
      signingKeys,
      bigNumberify(this.timeout).toNumber(),
      proposedAppInterface,
      isVirtualApp,
      isVirtualApp ? 1337 : stateChannel.numInstalledApps,
      this.initialState,
      0,
      bigNumberify(this.timeout).toNumber(),
      // the below two arguments are not currently used in app identity
      // computation
      undefined,
      {
        limit: bigNumberify(this.myDeposit).add(this.peerDeposit),
        tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
      }
    );

    return proposedAppInstance.identityHash;
  }

  toJson(): AppInstanceProposalJSON {
    return {
      identityHash: this.identityHash,
      appDefinition: this.appDefinition,
      abiEncodings: this.abiEncodings,
      myDeposit: { _hex: this.myDeposit.toHexString() },
      peerDeposit: { _hex: this.peerDeposit.toHexString() },
      initialState: this.initialState,
      timeout: { _hex: this.timeout.toHexString() },
      proposedByIdentifier: this.proposedByIdentifier,
      proposedToIdentifier: this.proposedToIdentifier,
      intermediaries: this.intermediaries,
      outcomeType: this.outcomeType
    };
  }

  static fromJson(json: AppInstanceProposalJSON): AppInstanceProposal {
    const proposeParams: IAppInstanceProposal = {
      appDefinition: json.appDefinition,
      abiEncodings: json.abiEncodings,
      myDeposit: bigNumberify(json.myDeposit._hex),
      peerDeposit: bigNumberify(json.peerDeposit._hex),
      timeout: bigNumberify(json.timeout._hex),
      initialState: json.initialState,
      proposedByIdentifier: json.proposedByIdentifier,
      proposedToIdentifier: json.proposedToIdentifier,
      intermediaries: json.intermediaries,
      outcomeType: json.outcomeType
    };

    return new AppInstanceProposal(proposeParams, undefined, json.identityHash);
  }
}
