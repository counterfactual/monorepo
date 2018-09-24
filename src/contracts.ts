import { BuildArtifact } from "@counterfactual/typescript-typings";
import * as fs from "fs";
import * as path from "path";
import { Address } from "./types";

function loadJsonFile(filepath: string): any {
  filepath = path.resolve(__dirname, filepath);
  const raw = fs.readFileSync(filepath).toString();
  return JSON.parse(raw);
}

export function loadContractArtifact(contractName: string): BuildArtifact {
  return loadJsonFile(`contracts/${contractName}.json`) as BuildArtifact;
}

export function getAddress(contractName: string, networkId: number): Address {
  // FIXME: De-docker-dependant-ize this statement
  const network = loadJsonFile(`../../contracts/networks/${networkId}.json`);
  for (const contract of network.contracts) {
    if (contract.contractName === contractName) {
      return contract.address;
    }
  }
  throw new Error(
    `Contract ${contractName} not deployed on network ${networkId}`
  );
}
