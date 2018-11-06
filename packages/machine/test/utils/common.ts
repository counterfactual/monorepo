import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";
import lodash from "lodash";

export const EMPTY_NETWORK_CONTEXT = new cf.utils.NetworkContext(
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero
);

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function mineOneBlock(provider: ethers.providers.JsonRpcProvider) {
  return provider.send("evm_mine", []);
}

export async function mineBlocks(
  n: number,
  provider: ethers.providers.JsonRpcProvider
) {
  lodash.times(n, async () => await mineOneBlock(provider));
}
