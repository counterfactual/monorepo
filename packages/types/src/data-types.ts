// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber, BigNumberish } from "ethers/utils";

import { AppInterface, SolidityValueType } from ".";

export type TwoPartyFixedOutcomeInterpreterParams = {
  // Derived from:
  // packages/cf-funding-protocol/contracts/interpreters/TwoPartyFixedOutcomeInterpreter.sol#L10
  playerAddrs: [string, string];
  amount: BigNumber;
  tokenAddress: string;
};

export type MultiAssetMultiPartyCoinTransferInterpreterParams = {
  // Derived from:
  // packages/cf-funding-protocol/contracts/interpreters/MultiAssetMultiPartyCoinTransferInterpreter.sol#L18
  limit: BigNumber[];
  tokenAddresses: string[];
};

export type SingleAssetTwoPartyCoinTransferInterpreterParams = {
  limit: BigNumber;
  tokenAddress: string;
};

export const multiAssetMultiPartyCoinTransferInterpreterParamsEncoding = `
  tuple(
    uint256[] limit,
    address[] tokenAddresses
  )
`;

export const singleAssetTwoPartyCoinTransferInterpreterParamsEncoding = `
  tuple(uint256 limit, address tokenAddress)
`;

export const twoPartyFixedOutcomeInterpreterParamsEncoding = `
  tuple(address[2] playerAddrs, uint256 amount)
`;

export const virtualAppAgreementEncoding = `
  tuple(
    uint256 capitalProvided,
    address capitalProvider,
    address virtualAppUser,
    address tokenAddress,
  )
`;

export const multiAssetMultiPartyCoinTransferEncoding = `
    tuple(
      address to,
      uint256 amount
    )[][]
`;

export type AppInstanceJson = {
  identityHash: string;
  multisigAddress: string;
  participants: string[];
  defaultTimeout: number;
  appInterface: AppInterface;
  isVirtualApp: boolean;
  appSeqNo: number;
  latestState: SolidityValueType;
  latestVersionNumber: number;
  latestTimeout: number;

  outcomeType: number;

  /**
   * Interpreter-related Fields
   */
  twoPartyOutcomeInterpreterParams?: {
    // Derived from:
    // packages/cf-funding-protocol/contracts/interpreters/TwoPartyFixedOutcomeInterpreter.sol#L10
    playerAddrs: [string, string];
    amount: { _hex: string };
    tokenAddress: string;
  };

  multiAssetMultiPartyCoinTransferInterpreterParams?: {
    // Derived from:
    // packages/cf-funding-protocol/contracts/interpreters/MultiAssetMultiPartyCoinTransferInterpreter.sol#L18
    limit: { _hex: string }[];
    tokenAddresses: string[];
  };

  singleAssetTwoPartyCoinTransferInterpreterParams?: {
    limit: { _hex: string };
    tokenAddress: string;
  };
};

export type AppInstanceInfo = {
  identityHash: string;
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  initiatorDeposit: BigNumber;
  initiatorDepositTokenAddress: string;
  responderDeposit: BigNumber;
  responderDepositTokenAddress: string;
  timeout: BigNumber;
  proposedByIdentifier: string; // xpub
  proposedToIdentifier: string; // xpub
  intermediaryIdentifier?: string;

  /**
   * Interpreter-related Fields
   */
  twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  multiAssetMultiPartyCoinTransferInterpreterParams?: MultiAssetMultiPartyCoinTransferInterpreterParams;
  singleAssetTwoPartyCoinTransferInterpreterParams?: SingleAssetTwoPartyCoinTransferInterpreterParams;
};

export type AppInstanceProposal = {
  abiEncodings: AppABIEncodings;
  appDefinition: string;
  appSeqNo: number;
  identityHash: string;
  initialState: SolidityValueType;
  initiatorDeposit: string;
  initiatorDepositTokenAddress: string;
  intermediaryIdentifier?: string;
  outcomeType: OutcomeType;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  responderDeposit: string;
  responderDepositTokenAddress: string;
  timeout: string;

  /**
   * Interpreter-related Fields
   */
  twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  multiAssetMultiPartyCoinTransferInterpreterParams?: MultiAssetMultiPartyCoinTransferInterpreterParams;
  singleAssetTwoPartyCoinTransferInterpreterParams?: SingleAssetTwoPartyCoinTransferInterpreterParams;
};



export type AppABIEncodings = {
  stateEncoding: string;
  actionEncoding: string | undefined;
};

export enum OutcomeType {
  // uint8
  TWO_PARTY_FIXED_OUTCOME = "TWO_PARTY_FIXED_OUTCOME",

  // CoinTransfer[][]
  MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER = "MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER",

  // CoinTransfer[2]
  SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER = "SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER"
}

// TwoPartyFixedOutcome.sol::Outcome
export enum TwoPartyFixedOutcome {
  SEND_TO_ADDR_ONE = 0,
  SEND_TO_ADDR_TWO = 1,
  SPLIT_AND_SEND_TO_BOTH_ADDRS = 2
}

export type CoinBalanceRefundState = {
  recipient: string;
  multisig: string;
  threshold: BigNumber;
  tokenAddress: string;
};

export const coinBalanceRefundStateEncoding = `
  tuple(
    address recipient,
    address multisig,
    uint256 threshold,
    address tokenAddress
  )
`;
