import * as ethers from "ethers";

export interface AppDefinition {
  address: string;
  appStateEncoding: string;
  appActionEncoding: string;
}

export interface AbiEncodings {
  appStateEncoding: string;
  appActionEncoding: string;
}

export interface Deposits {
  [s: string]: ethers.utils.BigNumber;
}

export type DeserializationCondition = {
  (data: [] | object): boolean;
};

export type DeserializationResolver = {
  (data: [] | object): [] | object;
};

export interface DeserializationCase {
  condition: DeserializationCondition;
  resolve: DeserializationResolver;
}
