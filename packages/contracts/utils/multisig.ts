import { ethers } from "ethers";

import { AbstractContract } from "./contract";
import { HIGH_GAS_LIMIT, signMessage } from "./misc";

const enum Operation {
  Call = 0,
  Delegatecall = 1
}

/**
 * Helper class for dealing with Multisignature wallets in tests.
 * Usage:
 * const multisig = new Multisig([alice.address, bob.address]);
 * await multisig.deploy(masterAccount);
 */
export class Multisig {
  private contract?: ethers.Contract;

  /**
   * Creates new undeployed Multisig instance
   * @param owners List of owner addresses
   */
  constructor(readonly owners: string[]) {
    owners.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Gets the on-chain address of the Multisig
   */
  get address() {
    if (!this.contract) {
      throw new Error("Must deploy Multisig contract first");
    }
    return this.contract.address;
  }

  /**
   * Deploy Multisig contract on-chain
   * @param wallet The wallet (with provider) for the on-chain transaction
   */
  public async deploy(wallet: ethers.Wallet) {
    const minimumViableMultisig = await AbstractContract.fromArtifactName(
      "MinimumViableMultisig"
    );
    this.contract = await minimumViableMultisig.deploy(wallet);
    await this.contract.functions.setup(this.owners);
  }

  /**
   * Execute delegatecall originating from Multisig contract
   * @param toContract Contract instance to send delegatecall to
   * @param funcName The name of the function to execute
   * @param args Arguments for the function call
   * @param signers The signers of the transaction
   */
  public async execDelegatecall(
    toContract: ethers.Contract,
    funcName: string,
    args: any[],
    signers: ethers.Wallet[]
  ): Promise<any> {
    if (toContract.interface.functions[funcName] === undefined) {
      throw new Error(
        `Tried to execute delegateCall to ${funcName} but no such function exists on the target contract`
      );
    }
    return this.execTransaction(
      toContract,
      funcName,
      args,
      Operation.Delegatecall,
      signers
    );
  }

  /**
   * Execute call originating from Multisig contract
   * @param toContract Contract instance to send call to
   * @param funcName The name of the function to execute
   * @param args Arguments for the function call
   * @param signers The signers of the transaction
   */
  public async execCall(
    toContract: ethers.Contract,
    funcName: string,
    args: any[],
    signers: ethers.Wallet[]
  ): Promise<any> {
    if (toContract.interface.functions[funcName] === undefined) {
      throw new Error(
        `Tried to execute call to ${funcName} but no such function exists on the target contract`
      );
    }
    return this.execTransaction(
      toContract,
      funcName,
      args,
      Operation.Call,
      signers
    );
  }

  private async execTransaction(
    toContract: ethers.Contract,
    funcName: string,
    args: any[],
    operation: Operation,
    wallets: ethers.Wallet[]
  ): Promise<any> {
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

    // estimateGas() doesn't work well for delegatecalls, so need to hardcode gas limit
    const options = operation === Operation.Delegatecall ? HIGH_GAS_LIMIT : {};
    const signatures = signMessage(transactionHash, ...wallets);

    return this.contract.functions.execTransaction(
      toContract.address,
      value,
      calldata,
      operation,
      signatures,
      options
    );
  }
}
