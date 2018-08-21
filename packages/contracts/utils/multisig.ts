import {
  deployContract,
  HIGH_GAS_LIMIT,
  signMessage
} from "@counterfactual/test-utils";
import * as ethers from "ethers";
import { MinimumViableMultisig } from "./buildArtifacts";
import { SharedContractAddresses, SharedContracts } from "./sharedContracts";
import { StateChannel, TransferTerms } from "./stateChannel";

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
  public readonly sharedContracts: SharedContracts;
  private contract?: ethers.Contract;

  /**
   * Creates new undeployed Multisig instance
   * @param signer
   * @param owners List of owner addresses
   * @param sharedContractAddresses
   */
  constructor(
    readonly signer: ethers.types.Signer,
    readonly owners: string[],
    sharedContractAddresses?: SharedContractAddresses
  ) {
    owners.sort((a, b) => a.localeCompare(b));
    this.sharedContracts = new SharedContracts(
      this.signer,
      sharedContractAddresses
    );
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

  public createStateChannel(
    app: ethers.Contract,
    appStateEncoding: string,
    terms: TransferTerms,
    defaultTimeout: number = 10
  ): StateChannel {
    return new StateChannel(
      this,
      this.owners, // TODO: deterministically generate new keys
      app,
      appStateEncoding,
      terms,
      defaultTimeout
    );
  }

  /**
   * Deploy Multisig contract on-chain
   */
  public async deploy() {
    this.contract = await MinimumViableMultisig.deploy(this.signer);
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
  ): Promise<ethers.types.Transaction> {
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
  ): Promise<ethers.types.Transaction> {
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
