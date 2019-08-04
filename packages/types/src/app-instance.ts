import { BigNumberish } from "ethers/utils";

export type AppIdentity = {
  channelNonce: BigNumberish;
  participants: string[];
  appDefinition: string;
  defaultTimeout: number;
};

export type AppInterface = {
  addr: string;
  stateEncoding: string;
  actionEncoding: string | undefined;
};

export type SignedStateHashUpdate = {
  appStateHash: string;
  versionNumber: number;
  timeout: number;
  signatures: string[];
};
