import RopstenContracts from "@counterfactual/contracts/networks/3.json";
import RinkebyContracts from "@counterfactual/contracts/networks/4.json";
import KovanContracts from "@counterfactual/contracts/networks/42.json";
import {
  DeployedContractNetworksFileEntry,
  EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT,
  NetworkContext
} from "@counterfactual/types";
import log from "loglevel";

import { INVALID_NETWORK_NAME } from "./methods/errors";

export const SUPPORTED_NETWORKS = new Set(["ropsten", "rinkeby", "kovan"]);

/**
 * Fetches a `NetworkContext` object for some network name string.
 *
 * @export
 * @param {string} networkName - name of the network
 * @returns {NetworkContext} - the corresponding NetworkContext
 */
export function getNetworkContextForNetworkName(
  networkName: string
): NetworkContext {
  log.info(`Configuring Node to use contracts on networkName: ${networkName}`);
  switch (networkName.toLocaleLowerCase()) {
    case "ropsten":
      return getNetworkContextFromNetworksFile(RopstenContracts);
    case "rinkeby":
      return getNetworkContextFromNetworksFile(RinkebyContracts);
    case "kovan":
      return getNetworkContextFromNetworksFile(KovanContracts);
    default:
      throw Error(
        `${INVALID_NETWORK_NAME}: ${networkName}. \n
         The following networks are supported:
         ${Array.from(SUPPORTED_NETWORKS.values())}`
      );
  }
}

function getNetworkContextFromNetworksFile(
  listOfDeployedContractsFromNetworkFile: DeployedContractNetworksFileEntry[]
): NetworkContext {
  return EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT.reduce(
    (acc, contractName) => ({
      ...acc,
      [contractName]: getContractAddressFromNetworksFile(
        listOfDeployedContractsFromNetworkFile,
        contractName
      )
    }),
    {} as NetworkContext
  );
}

function getContractAddressFromNetworksFile(
  listOfDeployedContractsFromNetworkFile: DeployedContractNetworksFileEntry[],
  contractName: string
): string {
  const matched = listOfDeployedContractsFromNetworkFile.filter(
    networkFileEntry => networkFileEntry.contractName === contractName
  );

  if (!matched.length) {
    throw new Error(
      `Could not find any deployed contract address for ${contractName}`
    );
  }

  return matched[0].address;
}
