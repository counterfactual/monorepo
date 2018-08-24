import { HIGH_GAS_LIMIT } from "@counterfactual/test-utils";
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
    // TODO: Load production artifacts when imported
    const truffleContract: BuildArtifact = artifacts.require(artifactName);
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
    return new AbstractContract(
      buildArtifact.abi,
      buildArtifact.bytecode,
      buildArtifact.networks,
      links
    );
  }

  /**
   * @param abi ABI of the abstract contract
   * @param bytecode Binary of the abstract contract
   * @param networks Network mapping of deployed addresses
   * @param links
   */
  constructor(
    readonly abi: string[] | string,
    readonly bytecode: string,
    readonly networks: NetworkMapping,
    readonly links?: { [contractName: string]: AbstractContract }
  ) {}

  /**
   * Get the deployed singleton instance of this abstract contract, if it exists
   * @param signer Signer (with provider) to use for contract calls
   * @throws Error if AbstractContract has no deployed address
   */
  public async getDeployed(signer: ethers.types.Signer): Promise<Contract> {
    if (!signer.provider) {
      throw new Error("Signer requires provider");
    }
    const networkId = (await signer.provider.getNetwork()).chainId;
    const address = this.getDeployedAddress(networkId);
    return new Contract(address, this.abi, signer);
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
    if (!signer.provider) {
      throw new Error("Signer requires provider");
    }

    const networkId = (await signer.provider.getNetwork()).chainId;
    const bytecode = this.generateLinkedBytecode(networkId);
    const contract = new Contract("", this.abi, signer);
    return contract.deploy(bytecode, ...(args || []));
  }

  /**
   * Connect to a deployed instance of this abstract contract
   * @param signer Signer (with provider) to use for contract calls
   * @param address Address of deployed instance to connect to
   * @returns Contract instance
   */
  public async connect(
    signer: ethers.types.Signer,
    address: string
  ): Promise<Contract> {
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
    registry: ethers.Contract,
    args?: any[],
    salt?: string
  ): Promise<Contract> {
    if (!signer.provider) {
      throw new Error("Signer requires provider");
    }

    if (salt === undefined) {
      salt = solidityKeccak256(
        ["uint256"],
        [Math.round(Math.random() * 4294967296)]
      );
    }
    const networkId = (await signer.provider.getNetwork()).chainId;
    const bytecode = this.generateLinkedBytecode(networkId);
    const initcode = new ethers.Interface(this.abi).deployFunction.encode(
      bytecode,
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

  private generateLinkedBytecode(networkId: number): string {
    if (!this.links) {
      throw new Error("Nothing to link");
    }
    let bytecode = this.bytecode;
    for (const name of Object.keys(this.links)) {
      const library = this.links[name];
      const regex = new RegExp(`__${name}_+`, "g");
      const address = library.getDeployedAddress(networkId);
      const addressHex = address.replace("0x", "");
      bytecode = bytecode.replace(regex, addressHex);
    }
    return bytecode;
  }

  private getDeployedAddress(networkId: number): string {
    const info = this.networks[networkId];
    if (!info) {
      throw new Error(`Abstract contract not deployed on network ${networkId}`);
    }
    return info.address;
  }
}
