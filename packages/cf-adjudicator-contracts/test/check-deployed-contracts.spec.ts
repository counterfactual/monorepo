import { DeployedContractNetworksFileEntry } from "@counterfactual/types";
import { readFileSync } from "fs";
import path from "path";

const CONTRACT_NAME = "ChallengeRegistry";

const NETWORKS_DIR = "./networks";

const NETWORK_NAME_TO_ID = {
  kovan: "42",
  ropsten: "3",
  rinkeby: "4"
};

describe("Checks that the ChallengeRegistry was deployed on each testnet", () => {
  const networks: ["kovan", "ropsten", "rinkeby"] = [
    "kovan",
    "ropsten",
    "rinkeby"
  ];

  networks.forEach((networkName: "kovan" | "ropsten" | "rinkeby") => {
    it(`checks deployments on ${networkName}`, () => {
      const networkDeployments = extractContractNamesFromDeployments(
        networkName
      );
      if (!networkDeployments.has(CONTRACT_NAME)) {
        throw new Error(
          `Contract ${CONTRACT_NAME} has not been deployed to the ${networkName} network`
        );
      }
    });
  });
});

function extractContractNamesFromDeployments(
  networkName: "ropsten" | "rinkeby" | "kovan"
): Set<string> {
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
