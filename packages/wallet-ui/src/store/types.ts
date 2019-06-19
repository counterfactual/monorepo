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

export enum ActionType {
  AddUser = "ADD_USER"
}

export type Dispatcher<DataType> = (dispatchRequest: Action<DataType>) => void;

export type Action<DataType> = {
  type: ActionType;
  data: DataType;
};
