import AdjudicatorMainnetContracts from "@counterfactual/cf-adjudicator-contracts/networks/1.json";
import AdjudicatorRopstenContracts from "@counterfactual/cf-adjudicator-contracts/networks/3.json";
import AdjudicatorRinkebyContracts from "@counterfactual/cf-adjudicator-contracts/networks/4.json";
import AdjudicatorKovanContracts from "@counterfactual/cf-adjudicator-contracts/networks/42.json";
import MainnetContracts from "@counterfactual/cf-funding-protocol-contracts/networks/1.json";
import RopstenContracts from "@counterfactual/cf-funding-protocol-contracts/networks/3.json";
import RinkebyContracts from "@counterfactual/cf-funding-protocol-contracts/networks/4.json";
import KovanContracts from "@counterfactual/cf-funding-protocol-contracts/networks/42.json";
import {
  DeployedContractNetworksFileEntry,
  EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT,
  NetworkContext
} from "@counterfactual/types";
import log from "loglevel";

import { INVALID_NETWORK_NAME } from "./methods/errors";
import { prettyPrintObject } from "./utils";

export enum EthereumNetworkName {
  Main = "mainnet",
  Ropsten = "ropsten",
  Rinkeby = "rinkeby",
  Kovan = "kovan"
}

export const SUPPORTED_NETWORKS = new Set([
  EthereumNetworkName.Main,
  EthereumNetworkName.Ropsten,
  EthereumNetworkName.Rinkeby,
  EthereumNetworkName.Kovan
]);

export function getNetworkEnum(network: string): EthereumNetworkName {
  switch (network.toLocaleLowerCase()) {
    case "mainnet":
      return EthereumNetworkName.Main;
    case "ropsten":
      return EthereumNetworkName.Ropsten;
    case "rinkeby":
      return EthereumNetworkName.Rinkeby;
    case "kovan":
      return EthereumNetworkName.Kovan;
    default:
      throw Error(
        `Network ${network} not supported. Supported networks are ${SUPPORTED_NETWORKS.values()}`
      );
  }
}

/**
 * Fetches a `NetworkContext` object for some network name string.
 *
 * @export
 * @param {string} networkName - name of the network
 * @returns {NetworkContext} - the corresponding NetworkContext
 */
export function getNetworkContextForNetworkName(
  networkName: EthereumNetworkName
): NetworkContext {
  log.info(`Configuring Node to use contracts on networkName: ${networkName}`);
  switch (networkName) {
    case EthereumNetworkName.Main:
      return getNetworkContextFromNetworksFile([
        ...MainnetContracts,
        ...AdjudicatorMainnetContracts
      ]);
    case EthereumNetworkName.Ropsten:
      return getNetworkContextFromNetworksFile([
        ...RopstenContracts,
        ...AdjudicatorRopstenContracts
      ]);
    case EthereumNetworkName.Rinkeby:
      return getNetworkContextFromNetworksFile([
        ...RinkebyContracts,
        ...AdjudicatorRinkebyContracts
      ]);
    case EthereumNetworkName.Kovan:
      return getNetworkContextFromNetworksFile([
        ...KovanContracts,
        ...AdjudicatorKovanContracts
      ]);
    default:
      throw Error(
        `${INVALID_NETWORK_NAME}: ${networkName}. \n
         The following networks are supported:
         ${prettyPrintObject(Array.from(SUPPORTED_NETWORKS.values()))}`
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
    throw Error(
      `Could not find any deployed contract address for ${contractName}`
    );
  }

  return matched[0].address;
}
