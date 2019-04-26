// This file should be removed in favour of the real "ethers" package typings.

declare class BigNumber {
  constructor(value: BigNumberish);
  fromTwos(value: number): BigNumber;
  toTwos(value: number): BigNumber;
  abs(): BigNumber;
  add(other: BigNumberish): BigNumber;
  sub(other: BigNumberish): BigNumber;
  div(other: BigNumberish): BigNumber;
  mul(other: BigNumberish): BigNumber;
  mod(other: BigNumberish): BigNumber;
  pow(other: BigNumberish): BigNumber;
  maskn(value: number): BigNumber;
  eq(other: BigNumberish): boolean;
  lt(other: BigNumberish): boolean;
  lte(other: BigNumberish): boolean;
  gt(other: BigNumberish): boolean;
  gte(other: BigNumberish): boolean;
  isZero(): boolean;
  toNumber(): number;
  toString(): string;
  toHexString(): string;
  static isBigNumber(value: any): value is BigNumber;
};

type Signer = {
  getAddress(): Promise<string>;
  signMessage(message): Promise<string>;
  sendTransaction(tx): Promise<any>;
  getBalance(): Promise<any>;
  provider: Web3Provider;
};

declare class Web3Provider {
  constructor(provider);
  getSigner(): Signer;
  getBalance(address: string): Promise<BigNumber>;
  on(event: string, callback: (...args) => void): void;
  once(event: string, callback: (...args) => void): void;
  removeAllListeners(event: string): void;
  estimateGas(tx): Promise<any>;
  getTransactionReceipt(tx: string): Promise<any>;
}

declare class HDNode {
  static fromExtendedKey(key: string): HDNode;
  derivePath(path: string): { publicKey: string };
}

declare var ethers: {
  utils: {
    formatEther: (value: BigNumber | Number) => string,
    parseEther: (value: string) => BigNumber,
    bigNumberify: (value: any) => BigNumber,
    solidityKeccak256: (type: string[], data: any[]) => string,
    computeAddress: (value: any) => string,
    HDNode: typeof HDNode
  },
  constants: {
    Zero: BigNumber
  },
  providers: {
    Web3Provider: typeof Web3Provider
  }
};
