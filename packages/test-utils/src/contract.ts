import * as ethers from "ethers";

/*
export async function deployContractViaRegistry(
  truffleContract: any,
  providerOrSigner: ethers.Wallet | ethers.types.Provider,
  cargs?: any[]
): Promise<{ cfAddr: string; contract: ethers.Contract }> {
  const Registry = artifacts.require("Registry");
  const registry = await getDeployedContract(Registry, providerOrSigner);
  const initcode = new ethers.Interface(
    truffleContract.abi
  ).deployFunction.encode(truffleContract.binary, cargs || []);
  const contractSalt = ethers.utils.solidityKeccak256(
    ["uint256"],
    [runningTally++]
  );
  const cfAddr = ethers.utils.solidityKeccak256(
    ["bytes1", "bytes", "uint256"],
    ["0x19", initcode, contractSalt]
  );

  await registry.functions.deploy(initcode, contractSalt, HIGH_GAS_LIMIT);

  const realAddr = await registry.functions.resolver(cfAddr);

  const contract = new ethers.Contract(
    realAddr,
    truffleContract.abi,
    providerOrSigner
  );

  return { cfAddr, contract };
}
*/

const { solidityKeccak256 } = ethers.utils;

interface Web3Contract {
  address: string;
  deployed(): Promise<{ address: string }>;
}

export class Contract extends ethers.Contract {
  public salt?: string;
  public cfAddress?: string;
  public registry?: Contract;
}

export class AbstractContract {
  public static fromTruffleArtifact(
    artifactName: string,
    links?: { [name: string]: AbstractContract }
  ) {
    const artifact = artifacts.require(artifactName);
    if (links) {
      for (const name of Object.keys(links)) {
        const library = links[name];
        if (!library.singletonContract) {
          throw new Error("Library must have singleton contract");
        }
        artifact.link(name, library.singletonContract.address);
      }
    }
    const abstractContract = new AbstractContract(
      artifact.abi,
      artifact.binary
    );
    abstractContract.singletonContract = artifact;
    return abstractContract;
  }

  private singletonContract?: Web3Contract;

  constructor(readonly abi: string[], readonly binary: string) {}

  public async getSingleton(signer: ethers.Wallet): Promise<Contract> {
    if (!this.singletonContract) {
      throw new Error("Not a singleton contract");
    }
    const { address } = await this.singletonContract.deployed();
    return new Contract(address, this.abi, signer);
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
    console.log(JSON.stringify({ initcode, salt }));
    await registry.functions.deploy(initcode, salt);
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
