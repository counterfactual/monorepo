export type WaffleLegacyOutput = {
  contractName?: string;
  networks?: {
    [x: string]: {
      address: string;
      events: {};
      links: { [x: string]: string | undefined };
      transactionHash: string;
    };
  };
};
