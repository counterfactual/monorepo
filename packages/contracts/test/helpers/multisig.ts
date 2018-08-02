import {
  deployContract,
  highGasLimit,
  signMessageBytes
} from "@counterfactual/test-utils";
import * as ethers from "ethers";

const enum Operation {
  Call = 0,
  Delegatecall = 1
}

export default class Multisig {
  private static loadTruffleContract() {
    const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
    const Signatures = artifacts.require("Signatures");
    MinimumViableMultisig.link("Signatures", Signatures.address);
    return MinimumViableMultisig;
  }

  private contract?: ethers.Contract;

  constructor(readonly owners: string[]) {}

  get address() {
    if (!this.contract) {
      throw new Error("Must deploy Multisig contract first");
    }
    return this.contract.address;
  }

  public async deploy(
    providerOrSigner: ethers.ethers.Wallet | ethers.types.MinimalProvider
  ) {
    const contract = await deployContract(
      Multisig.loadTruffleContract(),
      providerOrSigner
    );
    await contract.functions.setup(this.owners);
    this.contract = contract;
  }

  public async execDelegatecall(
    toContract: ethers.Contract,
    funcName: string,
    args: any[],
    wallets: ethers.Wallet[]
  ): Promise<ethers.types.Transaction> {
    return this.execTransaction(
      toContract,
      funcName,
      args,
      Operation.Delegatecall,
      wallets
    );
  }

  public async execCall(
    toContract: ethers.Contract,
    funcName: string,
    args: any[],
    wallets: ethers.Wallet[]
  ): Promise<ethers.types.Transaction> {
    return this.execTransaction(
      toContract,
      funcName,
      args,
      Operation.Call,
      wallets
    );
  }

  private async execTransaction(
    toContract: ethers.Contract,
    funcName: string,
    args: any[],
    operation: Operation,
    wallets: ethers.Wallet[]
  ): Promise<ethers.types.Transaction> {
    if (!this.contract) {
      throw new Error("Must deploy Multisig contract first");
    }
    const value = 0;
    const calldata = toContract.interface.functions[funcName].encode(args);

    const transactionHash = await this.contract.functions.getTransactionHash(
      toContract.address,
      value,
      calldata,
      operation
    );

    const signatures = signMessageBytes(transactionHash, wallets);
    return this.contract.functions.execTransaction(
      toContract.address,
      value,
      calldata,
      operation,
      signatures,
      highGasLimit
    );
  }
}
