import { BigNumberish } from "ethers/utils/bignumber";
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

export type AssetType = {
  name: string;
  tokenAddress: string;
};

export type Deposit = {
  amount: BigNumberish; // parseEther
  multisigAddress: string;
  nodeAddress: string;
  ethAddress: string;
};

export type Connection = {
  type: "hub" | "user" | "app";
  ethAddress: string;
  name: string;
  connections: Connection[];
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
  UserLogin = "USER_LOGIN",
  WalletSetAddress = "WALLET_SET_ADDRESS",
  WalletError = "WALLET_ERROR",
  WalletDeposit = "WALLET_DEPOSIT",
  WalletWithdraw = "WALLET_WITHDRAW",
  WalletSetBalance = "WALLET_SET_BALANCE",
  ChannelsGetAll = "CHANNELS_GET_ALL",
  ChannelsError = "CHANNELS_ERROR"
}

export type AppState = {
  error: ErrorData;
};

export type UserState = AppState & {
  user: User;
  status: string;
};

export type WalletState = AppState & {
  ethAddress: string;
  counterfactualBalance: BigNumberish;
  ethereumBalance: BigNumberish;
  status: string;
};

export type ChannelsMap = { [key: string]: Connection };

export type ChannelsState = AppState & {
  channels: ChannelsMap;
};

export type ApplicationState = {
  UserState: UserState;
  WalletState: WalletState;
  ChannelsState: ChannelsState;
};

export type StoreAction<DataType, ActionEnumType = ActionType> = Action<
  ActionType | ActionEnumType
> & {
  data: DataType;
};
