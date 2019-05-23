import RopstenContracts from "@counterfactual/contracts/networks/3.json";
import RinkebyContracts from "@counterfactual/contracts/networks/4.json";
import KovanContracts from "@counterfactual/contracts/networks/42.json";
import {
  ContractMigration,
  NetworkContext,
  networkContextProps
} from "@counterfactual/types";
import log from "loglevel";

import { INVALID_NETWORK_NAME } from "./methods/errors";

export const SUPPORTED_NETWORKS = new Set(["ropsten", "rinkeby", "kovan"]);

export function configureNetworkContext(network: string): NetworkContext {
  log.info(`Configuring Node to use contracts on network: ${network}`);

  switch (network.toLocaleLowerCase()) {
    case "ropsten": {
      return getContractAddressesForNetwork(RopstenContracts);
    }
    case "rinkeby": {
      return getContractAddressesForNetwork(RinkebyContracts);
    }
    case "kovan": {
      return getContractAddressesForNetwork(KovanContracts);
    }
    default: {
      throw Error(
        `${INVALID_NETWORK_NAME}: ${network}. \n
         The following networks are supported:
         ${Array.from(SUPPORTED_NETWORKS.values())}`
      );
    }
  }
}

function getContractAddressesForNetwork(
  migrations: ContractMigration[]
): NetworkContext {
  const ret = {} as any;

  for (const contractName of networkContextProps) {
    ret[contractName] = getContractAddress(migrations, contractName);
  }

  return ret;
}

function getContractAddress(
  migrations: ContractMigration[],
  contract: string
): string {
  const matched = migrations.filter(migration => {
    return migration.contractName === contract;
  });
  if (!matched.length) {
    throw Error(`No migrations for ${contract}`);
  }
  return matched[0].address;
}
