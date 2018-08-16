import * as ethers from "ethers";
import { ConditionalTransfer, NonceRegistry, Registry } from "./buildArtifacts";

export interface SharedContractAddresses {
  Registry: string;
  NonceRegistry: string;
  ConditionalTransfer: string;
}

export class SharedContracts {
  public static addressesFromBuildArtifacts(): SharedContractAddresses {
    return {
      Registry: Registry.getDeployedAddress(),
      NonceRegistry: NonceRegistry.getDeployedAddress(),
      ConditionalTransfer: ConditionalTransfer.getDeployedAddress()
    };
  }

  public readonly registry: ethers.Contract;
  public readonly nonceRegistry: ethers.Contract;
  public readonly conditionalTransfer: ethers.Contract;

  constructor(
    readonly sender: ethers.types.Signer,
    addresses?: SharedContractAddresses
  ) {
    if (!addresses) {
      addresses = SharedContracts.addressesFromBuildArtifacts();
    }
    this.registry = Registry.connect(
      this.sender,
      addresses.Registry
    );
    this.nonceRegistry = NonceRegistry.connect(
      this.sender,
      addresses.NonceRegistry
    );
    this.conditionalTransfer = ConditionalTransfer.connect(
      this.sender,
      addresses.ConditionalTransfer
    );
  }
}
