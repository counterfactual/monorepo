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
};

export type Wallet = {
  ethAddress: string;
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
  Error = "ERROR"
}

export type UserState = {
  user: User;
  error: ErrorData;
};

export type WalletState = {
  wallet: Wallet;
  error: ErrorData;
};

export type ApplicationState = {
  User: UserState;
  Wallet: WalletState;
};

export type StoreAction<DataType> = Action<ActionType> & {
  data: DataType;
};
