import {
  AppABIEncodings,
  OutcomeType,
  SolidityValueType
} from "@counterfactual/types";
import { BigNumberish } from "ethers/utils";

export interface AppInstanceProposal {
  identityHash: string;
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  initiatorDeposit: BigNumberish;
  initiatorDepositTokenAddress: string;
  responderDeposit: BigNumberish;
  responderDepositTokenAddress: string;
  timeout: BigNumberish;
  initialState: SolidityValueType;
  appSeqNo: number;
  proposedByIdentifier: string;
  proposedToIdentifier: string;
  intermediaryIdentifier?: string;
  outcomeType: OutcomeType;
};
