import * as ethers from "ethers";

export const UNUSED_FUNDED_ACCOUNT_PRIVATE_KEY: string = process.env
  .npm_package_config_unlockedAccount0!; // never null via test runtime
export const UNUSED_FUNDED_ACCOUNT = new ethers.Wallet(
  UNUSED_FUNDED_ACCOUNT_PRIVATE_KEY
).address;

export const A_PRIVATE_KEY: string = process.env
  .npm_package_config_unlockedAccount1!;
export const A_ADDRESS = new ethers.Wallet(A_PRIVATE_KEY).address;

export const B_PRIVATE_KEY: string = process.env
  .npm_package_config_unlockedAccount2!;
export const B_ADDRESS = new ethers.Wallet(B_PRIVATE_KEY).address;
