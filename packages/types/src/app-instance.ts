export type AppIdentity = {
  owner: string;
  signingKeys: string[];
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
  nonce: number;
  timeout: number;
  signatures: string;
};

export type CoinBucketBalance = {
  to: string;
  amount: { _hex: string };
};

export type DecodedFreeBalance = {
  tokenAddresses: string[];
  balances: CoinBucketBalance[];
};
