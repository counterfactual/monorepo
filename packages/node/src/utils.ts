import { Address } from "@counterfactual/types";
import { BigNumber, hashMessage } from "ethers/utils";

export function orderedAddressesHash(addresses: Address[]): string {
  addresses.sort((addrA: Address, addrB: Address) => {
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return hashMessage(addresses.join(""));
}
