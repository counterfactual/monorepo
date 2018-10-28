import * as ethers from "ethers";

import { HIGH_GAS_LIMIT } from "./misc";

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
  public static async loadBuildArtifact(
    artifactName: string,
    links?: { [name: string]: Promise<AbstractContract> }
  ): Promise<AbstractContract> {
    // TODO: Load build artifacts manually once we move away from Truffle
    // TODO: Load production artifacts when imported
    const contract: BuildArtifact = await import(`../../build/contracts/${artifactName}.json`);
    // const truffleContract: BuildArtifact = artifacts.require(artifactName);
    return AbstractContract.fromBuildArtifact(contract, links);
  }

  /**
   * Wrap build artifact in abstract contract
   * @param buildArtifact Truffle contract to wrap
   * @param links Optional AbstractContract libraries to link.
   * @returns Truffle artifact wrapped in an AbstractContract.
   */
  public static async fromBuildArtifact(
    buildArtifact: BuildArtifact,
    links?: { [name: string]: Promise<AbstractContract> }
  ): Promise<AbstractContract> {
    return new AbstractContract(
      buildArtifact.abi,
      buildArtifact.bytecode,
      buildArtifact.networks,
      links
    );
  }

  public static async getNetworkID(wallet: ethers.Wallet): Promise<number> {
    return (await wallet.provider.getNetwork()).chainId;
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
    readonly links?: { [contractName: string]: Promise<AbstractContract> }
  ) {}

  /**
   * Get the deployed singleton instance of this abstract contract, if it exists
   * @param Signer (with provider) to use for contract calls
   * @throws Error if AbstractContract has no deployed address
   */
  public async getDeployed(wallet: ethers.Wallet): Promise<Contract> {
    if (!wallet.provider) {
      throw new Error("Signer requires provider");
    }
    const networkId = (await wallet.provider.getNetwork()).chainId;
    const address = this.getDeployedAddress(networkId);
    return new Contract(address, this.abi, wallet);
  }

  /**
   * Deploy new instance of contract
   * @param wallet Wallet (with provider) to use for contract calls
   * @param args Optional arguments to pass to contract constructor
   * @returns New contract instance
   */
  public async deploy(wallet: ethers.Wallet, args?: any[]): Promise<Contract> {
    if (!wallet.provider) {
      throw new Error("Signer requires provider");
    }

    const networkId = (await wallet.provider.getNetwork()).chainId;
    const bytecode = (await this.links)
      ? await this.generateLinkedBytecode(networkId)
      : this.bytecode;
    const contractFactory = new ethers.ContractFactory(
      this.abi,
      bytecode,
      wallet
    );
    return contractFactory.deploy(...(args || []));
  }

  /**
   * Connect to a deployed instance of this abstract contract
   * @param signer Signer (with provider) to use for contract calls
   * @param address Address of deployed instance to connect to
   * @returns Contract instance
   */
  public async connect(
    signer: ethers.Signer,
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
    signer: ethers.Signer,
    registry: ethers.Contract,
    args?: any[],
    salt?: string
  ): Promise<Contract> {
    const definitelySalt =
      salt ||
      solidityKeccak256(["uint256"], [Math.round(Math.random() * 2e10)]);

    if (!signer.provider) {
      throw new Error("Signer requires provider");
    }

    const networkId = (await signer.provider.getNetwork()).chainId;
    const bytecode = await this.generateLinkedBytecode(networkId);
    const initcode = new ethers.utils.Interface(this.abi).deployFunction.encode(
      bytecode,
      args || []
    );
    await registry.functions.deploy(initcode, definitelySalt, HIGH_GAS_LIMIT);
    const cfAddress = solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, definitelySalt]
    );

    const address = await registry.functions.resolver(cfAddress);
    const contract = new Contract(address, this.abi, signer);
    contract.cfAddress = cfAddress;
    contract.salt = definitelySalt;
    contract.registry = registry;
    return contract;
  }

  public getDeployedAddress(networkId: number): string {
    const info = this.networks[networkId];
    if (!info) {
      throw new Error(`Abstract contract not deployed on network ${networkId}`);
    }
    return info.address;
  }

  public async generateLinkedBytecode(networkId: number): Promise<string> {
    if (this.links === undefined) {
      throw new Error("Nothing to link");
    }
    let bytecode = this.bytecode;
    for (const name of Object.keys(this.links)) {
      const library = this.links[name];
      const regex = new RegExp(`__${name}_+`, "g");
      const address = (await library).getDeployedAddress(networkId);
      const addressHex = address.replace("0x", "");
      bytecode = bytecode.replace(regex, addressHex);
    }
    return bytecode;
  }
}
