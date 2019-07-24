import {
  DeployedContractNetworksFileEntry,
  EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT
} from "@counterfactual/types";
import { readFileSync } from "fs";
import path from "path";

const NETWORKS_DIR = "./networks";

const NETWORK_NAME_TO_ID = {
  kovan: "42",
  ropsten: "3",
  rinkeby: "4"
};

const CONTRACTS_TO_SKIP = new Set([""]);

describe("Checks that all the needed contracts have been deployed on each test net", () => {
  const networks = ["kovan", "ropsten", "rinkeby"];
  networks.forEach((networkName: string) => {
    it(`checks deployments on ${networkName}`, () => {
      const networkDeployments = extractContractNamesFromDeployments(
        networkName
      );
      EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT.forEach(
        (contractName: string) => {
          if (
            !CONTRACTS_TO_SKIP.has(contractName) &&
            !networkDeployments.has(contractName)
          ) {
            throw new Error(contractNotDeployed(contractName, networkName));
          }
        }
      );
    });
  });
});

function contractNotDeployed(contractName: string, networkName: string) {
  return `Contract ${contractName} has not been deployed to the ${networkName} name`;
}

function extractContractNamesFromDeployments(networkName: string): Set<string> {
  return new Set(
    Array.from<DeployedContractNetworksFileEntry>(
      JSON.parse(
        readFileSync(
          path.join(NETWORKS_DIR, `${NETWORK_NAME_TO_ID[networkName]}.json`),
          "utf8"
        )
      )
    ).map<string>((migration: DeployedContractNetworksFileEntry) => {
      return migration.contractName;
    })
  );
}
