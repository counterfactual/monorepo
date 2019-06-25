import { Action } from "redux";
import { BigNumberish } from "ethers/utils/bignumber";

export type User = {
  id?: string;
  multisigAddress?: string;
  transactionHash?: string;
  token?: string;
  username: string;
  ethAddress: string;
  nodeAddress: string;
  email: string;
};

export type Deposit = {
  amount: BigNumberish; // parseEther
  multisigAddress: string;
  nodeAddress: string;
  ethAddress: string;
};

export type BalanceRequest = {
  nodeAddress: string;
  multisigAddress: string;
};

export type ErrorData = {
  message: string;
  code: string;
  field: string;
};

export enum ActionType {
  UserAdd = "USER_ADD",
  UserGet = "USER_GET",
  UserError = "USER_ERROR",
  WalletSetAddress = "WALLET_SET_ADDRESS",
  WalletError = "WALLET_ERROR",
  WalletDeposit = "WALLET_DEPOSIT",
  WalletSetBalance = "WALLET_SET_BALANCE"
}

export type UserState = {
  user: User;
  error: ErrorData;
};

export type WalletState = {
  ethAddress: string;
  counterfactualBalance: BigNumberish;
  ethereumBalance: BigNumberish;
  error: ErrorData;
};

export type ApplicationState = {
  UserState: UserState;
  WalletState: WalletState;
};

export type StoreAction<DataType, ActionEnumType = ActionType> = Action<
  ActionEnumType
> & {
  data: DataType;
};
