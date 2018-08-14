import * as ethers from "ethers";
import { AbstractContract } from "./contract";

export const ConditionalTransfer = AbstractContract.loadBuildArtifact(
  "ConditionalTransfer"
);
export const NonceRegistry = AbstractContract.loadBuildArtifact(
  "NonceRegistry"
);
export const Registry = AbstractContract.loadBuildArtifact("Registry");
export const StaticCall = AbstractContract.loadBuildArtifact("StaticCall");
export const Signatures = AbstractContract.loadBuildArtifact("Signatures");
export const Transfer = AbstractContract.loadBuildArtifact("Transfer");

export const StateChannel = AbstractContract.loadBuildArtifact("StateChannel", {
  StaticCall,
  Signatures,
  Transfer
});

export const MinimumViableMultisig = AbstractContract.loadBuildArtifact(
  "MinimumViableMultisig",
  {
    Signatures
  }
);

export class OnChainContext {
  constructor(
    private abstractContracts: { [name: string]: AbstractContract }
  ) {}

  public connect(contractName: string, sender: ethers.Wallet) {
    const abstractContract = this.abstractContracts[contractName];
    if (!abstractContract) {
      throw new Error(
        `Cannot find contract with name ${contractName} in context`
      );
    }
    return abstractContract.getDeployed(sender);
  }
}

export function getDefaultContext(): OnChainContext {
  return new OnChainContext({
    Registry,
    NonceRegistry,
    ConditionalTransfer
  });
}

export default {
  ConditionalTransfer,
  NonceRegistry,
  Registry,
  StaticCall,
  MinimumViableMultisig,
  Signatures,
  Transfer,
  StateChannel
};
