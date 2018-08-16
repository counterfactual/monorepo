import { HIGH_GAS_LIMIT } from "@counterfactual/test-utils";
import { BuildArtifact } from "@counterfactual/typescript-typings";
import * as ethers from "ethers";

const { solidityKeccak256 } = ethers.utils;

/**
 * Simple wrapper around ethers.Contract to include information about Counterfactual instantiation.
 */
export class Contract extends ethers.Contract {
  public salt?: string;
  public cfAddress?: string;
  public registry?: Contract;
}

/**
 * Convenience class for an undeployed contract i.e. only the ABI and bytecode.
 */
export class AbstractContract {
  /**
   * Load build artifact by name into an abstract contract
   * @example
   *  const CountingApp = AbstractContract.loadBuildArtifact("CountingApp", {StaticCall});
   * @param artifactName The name of the artifact to load
   * @param links Optional AbstractContract libraries to link.
   * @returns Truffle artifact wrapped in an AbstractContract.
   */
  public static loadBuildArtifact(
    artifactName: string,
    links?: { [name: string]: AbstractContract }
  ): AbstractContract {
    // TODO: Load build artifacts manually once we move away from Truffle
    const truffleContract = artifacts.require(artifactName);
    return AbstractContract.fromBuildArtifact(truffleContract, links);
  }

  /**
   * Wrap build artifact in abstract contract
   * @param buildArtifact Truffle contract to wrap
   * @param links Optional AbstractContract libraries to link.
   * @returns Truffle artifact wrapped in an AbstractContract.
   */
  public static fromBuildArtifact(
    buildArtifact: BuildArtifact,
    links?: { [name: string]: AbstractContract }
  ): AbstractContract {
    let { bytecode } = buildArtifact;
    if (links) {
      for (const name of Object.keys(links)) {
        const library = links[name];
        if (!library.deployedAddress) {
          throw new Error("Library must have a deployed address");
        }
        const regex = new RegExp(`__${name}_+`, "g");
        const addressHex = library.deployedAddress.replace("0x", "");
        bytecode = bytecode.replace(regex, addressHex);
      }
    }
    const abstractContract = new AbstractContract(buildArtifact.abi, bytecode);
    const networkNames = Object.keys(buildArtifact.networks);
    if (networkNames.length !== 0) {
      const networkName = networkNames.sort()[0];
      abstractContract.deployedAddress =
        buildArtifact.networks[networkName].address;
    }
    return abstractContract;
  }

  private deployedAddress?: string;

  /**
   * @param abi ABI of the abstract contract
   * @param binary Binary of the abstract contract
   */
  constructor(readonly abi: string[] | string, readonly binary: string) {}

  public getDeployedAddress(): string {
    if (!this.deployedAddress) {
      throw new Error("Must have a deployed address");
    }
    return this.deployedAddress;
  }

  /**
   * Get the deployed singleton instance of this abstract contract, if it exists
   * @param signer Signer (with provider) to use for contract calls
   * @throws Error if AbstractContract has no deployed address
   */
  public getDeployed(signer: ethers.types.Signer): Contract {
    return new Contract(this.getDeployedAddress(), this.abi, signer);
  }

  /**
   * Deploy new instance of contract
   * @param signer Signer (with provider) to use for contract calls
   * @param args Optional arguments to pass to contract constructor
   * @returns New contract instance
   */
  public async deploy(
    signer: ethers.types.Signer,
    args?: any[]
  ): Promise<Contract> {
    return new Contract("", this.abi, signer).deploy(
      this.binary,
      ...(args || [])
    );
  }

  /**
   * Connect to a deployed instance of this abstract contract
   * @param signer Signer (with provider) to use for contract calls
   * @param address Address of deployed instance to connect to
   * @returns Contract instance
   */
  public connect(signer: ethers.types.Signer, address: string): Contract {
    return new Contract(address, this.abi, signer);
  }

  /**
   * Deploys new contract instance through a Counterfactual Registry
   * @param signer Signer (with provider) to use for contract calls
   * @param registry Counterfactual Registry instance to use
   * @param args Optional arguments to pass to contract constructor
   * @param salt Optional salt for Counterfactual deployment
   * @returns Contract instance
   */
  public async deployViaRegistry(
    signer: ethers.types.Signer,
    registry: Contract,
    args?: any[],
    salt?: string
  ): Promise<Contract> {
    if (salt === undefined) {
      salt = solidityKeccak256(
        ["uint256"],
        [Math.round(Math.random() * 4294967296)]
      );
    }
    const initcode = new ethers.Interface(this.abi).deployFunction.encode(
      this.binary,
      args || []
    );
    await registry.functions.deploy(initcode, salt, HIGH_GAS_LIMIT);
    const cfAddress = solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, salt]
    );

    const address = await registry.functions.resolver(cfAddress);
    const contract = new Contract(address, this.abi, signer);
    contract.cfAddress = cfAddress;
    contract.salt = salt;
    contract.registry = registry;
    return contract;
  }
}
