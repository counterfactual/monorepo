import {
  NAMES_OF_DEPLOYED_CONTRACTS_REQUIRED_FOR_COUNTERFACTUAL,
  NetworkContext
} from "@counterfactual/types";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

/// todo(xuanji): make this random but deterministically generated from some seed
export function generateRandomNetworkContext(): NetworkContext {
  return NAMES_OF_DEPLOYED_CONTRACTS_REQUIRED_FOR_COUNTERFACTUAL.reduce(
    (acc, contractName) => ({
      ...acc,
      [contractName]: getAddress(hexlify(randomBytes(20)))
    }),
    {} as NetworkContext
  );
}
