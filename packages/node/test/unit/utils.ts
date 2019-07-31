import {
  AppABIEncodings,
  OutcomeType,
  SolidityValueType
} from "@counterfactual/types";
import { Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";

import {
  AppInstance,
  AppInstanceProposal,
  StateChannel
} from "../../src/models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/models/free-balance";

export function computeRandomXpub() {
  return fromMnemonic(Wallet.createRandom().mnemonic).neuter().extendedKey;
}

export function createAppInstanceProposalForTest(appInstanceId: string) {
  return new AppInstanceProposal(
    {
      proposedByIdentifier: computeRandomXpub(),
      proposedToIdentifier: computeRandomXpub(),
      appDefinition: AddressZero,
      abiEncodings: {
        stateEncoding: "tuple(address foo, uint256 bar)",
        actionEncoding: undefined
      } as AppABIEncodings,
      initiatorDeposit: Zero,
      responderDeposit: Zero,
      timeout: One,
      initialState: {
        foo: AddressZero,
        bar: 0
      } as SolidityValueType,
      outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME,
      initiatorDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      responderDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
    },
    undefined,
    appInstanceId
  );
}

export function createAppInstanceForTest(stateChannel?: StateChannel) {
  return new AppInstance(
    /* multisigAddress */ stateChannel
      ? stateChannel.multisigAddress
      : getAddress(hexlify(randomBytes(20))),
    /* participants */ stateChannel
      ? stateChannel.getSigningKeysFor(stateChannel.numInstalledApps)
      : [
          getAddress(hexlify(randomBytes(20))),
          getAddress(hexlify(randomBytes(20)))
        ],
    /* defaultTimeout */ 0,
    /* appInterface */ {
      addr: getAddress(hexlify(randomBytes(20))),
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    },
    /* isVirtualApp */ false,
    /* appSeqNo */ stateChannel
      ? stateChannel.numInstalledApps
      : Math.ceil(1000 * Math.random()),
    /* latestState */ { foo: AddressZero, bar: bigNumberify(0) },
    /* latestVersionNumber */ 0,
    /* latestTimeout */ Math.ceil(1000 * Math.random()),
    /* outcomeType */ OutcomeType.TWO_PARTY_FIXED_OUTCOME,
    /* twoPartyOutcomeInterpreterParams */ {
      playerAddrs: [AddressZero, AddressZero],
      amount: Zero,
      tokenAddress: AddressZero
    },
    /* multiAssetMultiPartyCoinTransferInterpreterParams */ undefined,
    /* singleAssetTwoPartyCoinTransferInterpreterParams */ undefined
  );
}
