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
  WalletSetBalance = "WALLET_SET_BALANCE",
  ChannelsGetAll = "CHANNELS_GET_ALL",
  ChannelsError = "CHANNELS_ERROR"
}

export type UserState = {
  user: User;
  error: ErrorData;
  status: string;
};

export type WalletState = {
  ethAddress: string;
  counterfactualBalance: BigNumberish;
  ethereumBalance: BigNumberish;
  error: ErrorData;
  status: string;
};

export type ChannelsMap = { [key: string]: Connection };

export type ChannelsState = {
  channels: ChannelsMap;
  error: ErrorData;
};

export type ApplicationState = {
  UserState: UserState;
  WalletState: WalletState;
  ChannelsState: ChannelsState;
};

export type StoreAction<DataType, ActionEnumType = ActionType> = Action<
  ActionEnumType | ActionType
> & {
  data: DataType;
};
