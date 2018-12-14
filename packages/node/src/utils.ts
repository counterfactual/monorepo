import { Address } from "@counterfactual/common-types";
import { ethers } from "ethers";

export const zeroBalance = ethers.utils.bigNumberify("0");

export function orderedAddressesHash(addresses: Address[]): string {
  addresses.sort((addrA: Address, addrB: Address) => {
    return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return ethers.utils.hashMessage(addresses.join(""));
}
