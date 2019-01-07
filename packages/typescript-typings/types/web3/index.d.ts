// API matches version 0.20.3 of Web3

declare class BigNumber {
  constructor(num: string);
  toNumber(): number;
}

declare var web3: {
  fromWei: (amount: number, unit: string) => string;
  toWei: (amount: BigNumber, unit: string) => string | BigNumber;
  BigNumber: (num: string) => void;
  eth: {
    defaultBlock: number | string;
    getBalance: (
      address: string,
      defaultBlock?: number | string,
      callback?: (error: Error, balance: BigNumber) => void
    ) => void;
    sendTransaction: (
      transactionObject: {
        from: string | number;
        to?: string;
        value: number | string | BigNumber;
      },
      callback: (err: Error, result: any) => void
    ) => void;
  };
  personal: {
    sign: (
      dataToSign: string,
      from: string | number,
      callback: (err: Error, signedData: string) => void
    ) => void;
  };
  currentProvider: {
    enable: () => Promise<void>;
    selectedAddress: string;
  };
  version: {
    network: string;
  };
};
