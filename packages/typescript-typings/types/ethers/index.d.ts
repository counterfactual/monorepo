// This file should be removed in favour of the real "ethers" package typings.

type Signer = {
  getAddress(): Promise<string>;
  signMessage(message): Promise<string>;
  sendTransaction(tx): Promise<any>;
  getBalance(): Promise<any>;
};

declare class Web3Provider {
  constructor(provider);
  getSigner(): Signer;
}

declare var ethers = {
  utils: {
    formatEther: (value: string) => string,
    parseEther: (value: string) => BigNumber,
    bigNumberify: (value: any) => BigNumber,
    solidityKeccak256: (type: string[], data: any[]) => string
  },
  providers: {
    Web3Provider: Web3Provider
  }
};
