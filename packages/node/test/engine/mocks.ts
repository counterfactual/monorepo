import {
  EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT,
  NetworkContext
} from "@counterfactual/types";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

/// todo(xuanji): make this random but deterministically generated from some seed
export function generateRandomNetworkContext(): NetworkContext {
  return EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT.reduce(
    (acc, contractName) => ({
      ...acc,
      [contractName]: getAddress(hexlify(randomBytes(20)))
    }),
    {} as NetworkContext
  );
}
