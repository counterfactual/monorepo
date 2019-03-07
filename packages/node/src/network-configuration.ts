import RopstenContracts from "@counterfactual/contracts/networks/3.json";
import RinkebyContracts from "@counterfactual/contracts/networks/4.json";
import { NetworkContext } from "@counterfactual/types";

import { ERRORS } from "./methods/errors";

const SUPPORTED_NETWORKS = new Set(["ropsten", "rinkeby"]);

export function configureNetworkContext(network: string): NetworkContext {
  console.log(`Configuring Node to use contracts on network: ${network}`);

  switch (network) {
    case "ropsten": {
      return getContractAddressesForNetwork(RopstenContracts);
    }
    case "rinkeby": {
      return getContractAddressesForNetwork(RinkebyContracts);
    }
    default: {
      throw Error(
        `${ERRORS.INVALID_NETWORK_NAME}: ${network}. \n
         The following networks are supported:
         ${Array.from(SUPPORTED_NETWORKS.values())}`
      );
    }
  }
}

interface Migration {
  contractName: string;
  address: string;
  transactionHash: string;
}

function getContractAddressesForNetwork(
  migrations: Migration[]
): NetworkContext {
  return {
    AppRegistry: getContractAddress(migrations, "AppRegistry"),
    ETHBalanceRefund: getContractAddress(migrations, "ETHBalanceRefundApp"),
    ETHBucket: getContractAddress(migrations, "ETHBucket"),
    MultiSend: getContractAddress(migrations, "MultiSend"),
    NonceRegistry: getContractAddress(migrations, "NonceRegistry"),
    StateChannelTransaction: getContractAddress(
      migrations,
      "StateChannelTransaction"
    ),
    ETHVirtualAppAgreement: getContractAddress(
      migrations,
      "ETHVirtualAppAgreement"
    ),
    MinimumViableMultisig: getContractAddress(
      migrations,
      "MinimumViableMultisig"
    ),
    ProxyFactory: getContractAddress(migrations, "ProxyFactory")
  };
}

function getContractAddress(migrations: Migration[], contract: string): string {
  return migrations.filter(migration => {
    return migration.contractName === contract;
  })[0].address;
}
