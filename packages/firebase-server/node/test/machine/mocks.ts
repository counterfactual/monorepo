import { NetworkContext, networkContextProps } from "@counterfactual/types";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

/// todo(xuanji): make this random but deterministically generated from some seed
export function generateRandomNetworkContext(): NetworkContext {
  const ret = {} as any;

  for (const contractName of networkContextProps) {
    ret[contractName] = getAddress(hexlify(randomBytes(20)));
  }

  return ret;
}
