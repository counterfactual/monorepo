// API matches version 0.20.3 of Web3

declare var web3: {
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
