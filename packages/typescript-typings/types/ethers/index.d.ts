// This file should be removed in favour of the real "ethers" package typings.

declare var ethers = {
  utils: {
    formatEther: (value: string) => string,
    parseEther: (value: string) => BigNumber
  }
};
