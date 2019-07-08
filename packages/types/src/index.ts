import {
  AppIdentity,
  AppInterface,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  CoinTransferInterpreterParams,
  ethBalanceRefundStateEncoding,
  OutcomeType,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
} from "./data-types";
import { INodeProvider, IRpcNodeProvider, Node } from "./node";
import {
  ABIEncoding,
  Address,
  AppInstanceID,
  Bytes32,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  ChallengeRegistry: string;
  ConditionalTransactionDelegateTarget: string;
  ETHBalanceRefundApp: string;
  CoinTransferETHInterpreter: string;
  FreeBalanceApp: string;
  IdentityApp: string;
  MinimumViableMultisig: string;
  ProxyFactory: string;
  TwoPartyFixedOutcomeETHInterpreter: string;
  TwoPartyFixedOutcomeFromVirtualAppETHInterpreter: string;
}

// Keep in sync with above
export const networkContextProps = [
  "ChallengeRegistry",
  "ConditionalTransactionDelegateTarget",
  "ETHBalanceRefundApp",
  "CoinTransferETHInterpreter",
  "IdentityApp",
  "FreeBalanceApp",
  "MinimumViableMultisig",
  "ProxyFactory",
  "TwoPartyFixedOutcomeETHInterpreter",
  "TwoPartyFixedOutcomeFromVirtualAppETHInterpreter"
];

export interface ContractMigration {
  contractName: string;
  address: string;
  transactionHash: string;
}

export {
  ABIEncoding,
  Address,
  AppABIEncodings,
  AppIdentity,
  AppInstanceID,
  AppInstanceInfo,
  AppInterface,
  CoinTransferInterpreterParams,
  ethBalanceRefundStateEncoding,
  SolidityABIEncoderV2Type,
  Bytes32,
  INodeProvider,
  IRpcNodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
};
