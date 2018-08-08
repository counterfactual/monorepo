import * as ethers from "ethers";
import { HIGH_GAS_LIMIT } from "./utils";

const { solidityKeccak256 } = ethers.utils;

export interface TruffleContract {
  readonly contractName: string;
  readonly abi: any[];
  readonly bytecode: string;
  readonly networks: { [networkName: string]: { address: string } };
}

export class Contract extends ethers.Contract {
  public salt?: string;
  public cfAddress?: string;
  public registry?: Contract;
}

export class AbstractContract {
  public static loadTruffleArtifact(
    artifactName: string,
    links?: { [name: string]: AbstractContract }
  ): AbstractContract {
    const truffleContract = artifacts.require(artifactName);
    return AbstractContract.fromTruffleContract(truffleContract, links);
  }

  public static fromTruffleContract(
    truffleContract: TruffleContract,
    links?: { [name: string]: AbstractContract }
  ): AbstractContract {
    let { bytecode } = truffleContract;
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
    const abstractContract = new AbstractContract(
      truffleContract.abi,
      bytecode
    );
    const networkNames = Object.keys(truffleContract.networks);
    if (networkNames.length !== 0) {
      const networkName = networkNames.sort()[0];
      abstractContract.deployedAddress =
        truffleContract.networks[networkName].address;
    }
    return abstractContract;
  }

  private deployedAddress?: string;

  constructor(readonly abi: string[], readonly binary: string) {}

  public getDeployed(signer: ethers.Wallet): Contract {
    if (!this.deployedAddress) {
      throw new Error("Must have a deployed address");
    }
    return new Contract(this.deployedAddress, this.abi, signer);
  }

  public async deploy(signer: ethers.Wallet, args?: any[]): Promise<Contract> {
    return new Contract("", this.abi, signer).deploy(
      this.binary,
      ...(args || [])
    );
  }

  public async connect(
    signer: ethers.Wallet,
    address: string
  ): Promise<Contract> {
    return new Contract(address, this.abi, signer);
  }

  public async deployViaRegistry(
    signer: ethers.Wallet,
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
