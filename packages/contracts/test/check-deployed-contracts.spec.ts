import { ContractMigration, networkContextProps } from "@counterfactual/types";
import { readFileSync } from "fs";
import path from "path";

const NETWORKS_DIR = "./networks";

const NETWORK_NAME_TO_ID = {
  kovan: "42",
  ropsten: "3",
  rinkeby: "4"
};

describe("Checks that all the needed contracts have been deployed on each test net", () => {
  it("checks deployments on Kovan", () => {
    const networkName = "kovan";
    const kovanDeployments = extractContractNamesFromDeployments(networkName);
    networkContextProps.forEach((contractName: string) => {
      if (!kovanDeployments.has(contractName)) {
        throw Error(contractNotDeployed(contractName, networkName));
      }
    });
  });

  it("checks deployments on Ropsten", () => {
    const networkName = "ropsten";
    const ropstenDeployments = extractContractNamesFromDeployments(networkName);
    networkContextProps.forEach((contractName: string) => {
      if (!ropstenDeployments.has(contractName)) {
        throw Error(contractNotDeployed(contractName, networkName));
      }
    });
  });

  it("checks deployments on Rinkeby", () => {
    const networkName = "rinkeby";
    const rinkebyDeployments = extractContractNamesFromDeployments(networkName);
    networkContextProps.forEach((contractName: string) => {
      if (!rinkebyDeployments.has(contractName)) {
        throw Error(contractNotDeployed(contractName, networkName));
      }
    });
  });
});

function contractNotDeployed(contractName: string, networkName: string) {
  return `Contract ${contractName} has not been deployed to the ${networkName} name`;
}

function extractContractNamesFromDeployments(networkName: string): Set<string> {
  return new Set(
    Array.from<ContractMigration>(
      JSON.parse(
        readFileSync(
          path.join(NETWORKS_DIR, `${NETWORK_NAME_TO_ID["kovan"]}.json`),
          "utf8"
        )
      )
    ).map<string>((migration: ContractMigration) => {
      return migration.contractName;
    })
  );
}
