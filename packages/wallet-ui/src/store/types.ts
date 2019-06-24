import { Action } from "redux";

export type User = {
  id?: string;
  multisigAddress?: string;
  transactionHash?: string;
  token?: string;
  username: string;
  ethAddress: string;
  nodeAddress: string;
  email: string;
  balance?: string;
};

export type ErrorData = {
  message: string;
  code: string;
  field: string;
};

export enum ActionType {
  AddUser = "ADD_USER",
  ConnectToWallet = "CONNECT_TO_WALLET",
  SetWalletAddress = "SET_WALLET_ADDRESS",
  Error = "UserError"
}

export type UserState = {
  user: User;
  error: ErrorData;
};

export type WalletState = {
  ethAddress: string;
  error: ErrorData;
};

export type ApplicationState = {
  UserState: UserState;
  WalletState: WalletState;
};

export type StoreAction<DataType, ActionEnumType> = Action<ActionEnumType> & {
  data: DataType;
};
