import { BigNumber } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../constants";

export const APP_ALREADY_UNINSTALLED = (id: string) =>
  `Cannot uninstall app ${id}, it has already been uninstalled`;

export const CANNOT_DEPOSIT =
  "Cannot deposit while another deposit is occurring in the channel.";

export const CANNOT_UNINSTALL_FREE_BALANCE = (multisigAddress: string) =>
  `Cannot uninstall the FreeBalance of channel: ${multisigAddress}`;

export const CANNOT_WITHDRAW =
  "Cannot withdraw while another deposit / withdraw app is active in the channel.";

export const CHANNEL_CREATION_FAILED =
  "Failed to create channel. Multisignature wallet cannot be deployed properly";

export const DEPOSIT_FAILED = "Failed to send funds to the multisig contract";

export const ETH_BALANCE_REFUND_NOT_UNINSTALLED =
  "The ETH balance refund AppInstance is still installed when it's not supposed to be";

export const FAILED_TO_GET_ERC20_BALANCE = (
  tokenAddress: string,
  address: string
) =>
  `Failed to get the balance of address: ${address} for ERC20 token: ${tokenAddress}`;

export const IMPROPERLY_FORMATTED_STRUCT =
  "Improperly formatted ABIEncoderV2 struct";

export const INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT = (
  address: string,
  amount: BigNumber,
  balance: BigNumber
) =>
  `Node's default signer has ${balance} and needs ${amount} of the specified ERC20 token ${address} to deposit`;

export const INSUFFICIENT_FUNDS_TO_WITHDRAW = (
  address: string,
  amount: BigNumber,
  balance: BigNumber
) => {
  if (address === CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
    return `Node has ${balance} and needs ${amount} ETH to withdraw`;
  }
  return `Node has ${balance} and needs ${amount} of token ${address} to withdraw`;
};

export const INSUFFICIENT_FUNDS_IN_FREE_BALANCE_FOR_ASSET = (
  publicIdentifier: string,
  multisigAddress: string,
  tokenAddress: string,
  balance: BigNumber,
  allocationAmount: BigNumber
) =>
  `Node with public identifier ${publicIdentifier} has insufficient funds in channel ${multisigAddress}
  for token ${tokenAddress} to allocate towards an AppInstance. Current free balance for token is ${balance},
  attempted allocation amount: ${allocationAmount} `;

export const INSUFFICIENT_FUNDS =
  "Node's default signer does not have enough funds for this action";

export const INVALID_ACTION = "Invalid action taken";

export const INVALID_NETWORK_NAME =
  "Invalid network name provided for initializing Node";

export const NO_ACTION_ENCODING_FOR_APP_INSTANCE =
  "The AppInstance does not have an Action encoding defined";

export const NO_APP_CONTRACT_ADDR = "The App Contract address is empty";

export const NO_APP_INSTANCE_FOR_GIVEN_ID =
  "No AppInstance exists for the given ID";

export const NO_APP_INSTANCE_FOR_TAKE_ACTION =
  "No AppInstanceId specified to takeAction on";

export const NO_APP_INSTANCE_ID_FOR_GET_STATE =
  "No string specified to get state for";

export const NO_APP_INSTANCE_ID_TO_GET_DETAILS =
  "No string specified to get details for";

export const NO_APP_INSTANCE_ID_TO_INSTALL =
  "No AppInstanceId specified to install";

export const NO_APP_INSTANCE_ID_TO_UNINSTALL =
  "No AppInstanceId specified to uninstall";

export const NO_MULTISIG_FOR_APP_INSTANCE_ID =
  "No multisig address exists for the given appInstanceId";

export const NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID = (id: string) =>
  `No proposed AppInstance exists for the given appInstanceId: ${id}`;

export const NO_STATE_CHANNEL_FOR_MULTISIG_ADDR = multisigAddress =>
  `Call to getStateChannel failed when searching for multisig address: ${multisigAddress}. This probably means that the StateChannel does not exist yet.`;

export const NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT =
  "The multisig deployment transaction does not have a hash";

export const NULL_INITIAL_STATE_FOR_PROPOSAL =
  "A proposed AppInstance cannot have an empty initial state";

export const STATE_OBJECT_NOT_ENCODABLE =
  "The state object is not encodable by the AppInstance's state encoding";

export const TWO_PARTY_OUTCOME_DIFFERENT_ASSETS = (
  assetA: string,
  assetB: string
) =>
  `For a TWO_PARTY_FIXED_OUTCOME there cannot be two kinds of tokens deposited: ${assetA} and ${assetB}`;

export const VIRTUAL_APP_INSTALLATION_FAIL =
  "Failed to install the virtual App Instance";

export const WITHDRAWAL_FAILED =
  "Failed to withdraw funds out of the multisig contract";
