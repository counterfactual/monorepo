import { ethers } from "ethers";

import * as artifacts from "./buildArtifacts";
import { Contract } from "./contract";
import { signMessage } from "./misc";
import { Multisig } from "./multisig";
import { abiEncodingForStruct, encodeStruct } from "./structEncoding";

const { keccak256 } = ethers.utils;

export enum AssetType {
  ETH,
  ERC20
}

export interface TransferTerms {
  assetType: AssetType;
  limit: ethers.utils.BigNumber;
  token?: string;
}

export interface AppDefinition {
  addr: string;
  applyAction: string;
  resolve: string;
  getTurnTaker: string;
  isStateTerminal: string;
}

function appFromContract(contract: ethers.Contract): AppDefinition {
  return {
    addr: contract.address,
    applyAction: contract.interface.functions.applyAction.sighash,
    resolve: contract.interface.functions.resolve.sighash,
    getTurnTaker: contract.interface.functions.getTurnTaker.sighash,
    isStateTerminal: contract.interface.functions.isStateTerminal.sighash
  };
}

export class AppInstance {
  public readonly app: AppDefinition;

  public contract?: Contract;
  public appStateNonce: number = 0;

  constructor(
    readonly signerAddrs: string[],
    readonly multisig: Multisig,
    readonly appContract: ethers.Contract,
    readonly appStateEncoding: string,
    readonly terms: TransferTerms,
    readonly defaultTimeout: number = 10
  ) {
    if (this.terms.token === undefined) {
      this.terms.token = ethers.constants.AddressZero;
    }
    this.app = appFromContract(appContract);
  }

  public async deploy(sender: ethers.Wallet, registry: ethers.Contract) {
    const appHash = keccak256(encodeStruct(appEncoding, this.app));
    const termsHash = keccak256(encodeStruct(termsEncoding, this.terms));
    this.contract = await (await artifacts.AppInstance).deployViaRegistry(
      sender,
      registry,
      [
        this.multisig.address,
        this.signerAddrs,
        appHash,
        termsHash,
        this.defaultTimeout
      ]
    );
  }

  public async setState(
    appState: object,
    signers: ethers.Wallet[],
    timeout: number = 0,
    appStateNonce: number = this.appStateNonce + 1
  ) {
    if (!this.contract) {
      throw new Error("Not deployed");
    }
    const appStateHash = keccak256(
      encodeStruct(this.appStateEncoding, appState)
    );
    const stateHash = computeStateHash(
      this.signerAddrs,
      appStateHash,
      appStateNonce,
      timeout
    );
    const signatures = signMessage(stateHash, ...signers);
    await this.contract.functions.setState(
      appStateHash,
      appStateNonce,
      timeout,
      signatures
    );
    this.appStateNonce = appStateNonce;
  }

  public async setResolution(appState: object) {
    if (!this.contract) {
      throw new Error("Not deployed");
    }
    await this.contract.functions.setResolution(
      this.app,
      encodeStruct(this.appStateEncoding, appState),
      encodeStruct(termsEncoding, this.terms)
    );
  }
}

/**
 * Compute the raw state hash for use in the AppInstance contract.
 * @param signingKeys Signing keys of the AppInstance
 * @param appStateHash App state hash
 * @param appStateNonce App state nonce
 * @param timeout Time until finalization.
 * @returns string 32-byte keccak256 hash
 */
export function computeStateHash(
  signingKeys: string[],
  appStateHash: string,
  appStateNonce: number,
  timeout: number
): string {
  return ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", signingKeys, appStateNonce, timeout, appStateHash]
  );
}

/**
 * Compute the raw action hash for use in the AppInstance contract.
 * @param turnTaker The address of the turn taker
 * @param prevStateHash The previous app state hash
 * @param action The action
 * @param appStateNonce The app state nonce
 * @param disputeNonce The dispute nonce
 * @returns string 32-byte keccak256 hash
 */
export function computeActionHash(
  turnTaker: string,
  prevStateHash: string,
  action: string,
  appStateNonce: number,
  disputeNonce: number
): string {
  return ethers.utils.solidityKeccak256(
    ["bytes1", "address", "bytes32", "bytes", "uint256", "uint256"],
    ["0x19", turnTaker, prevStateHash, action, appStateNonce, disputeNonce]
  );
}

/**
 * Computes nonce registry key
 * @param multisigAddress Address of Multisig contract
 * @param nonceSalt Nonce salt
 * @returns string 32-byte keccak256 hash
 */
export function computeNonceRegistryKey(
  timeout: ethers.utils.BigNumber,
  multisigAddress: string,
  nonceSalt: string
) {
  return ethers.utils.solidityKeccak256(
    ["address", "uint256", "bytes32"],
    [multisigAddress, timeout, nonceSalt]
  );
}

/**
 * Solidity struct type for the Transfer.Terms struct
 */
export const termsEncoding = abiEncodingForStruct(`
  uint8 assetType;
  uint256 limit;
  address token;
`);

/**
 * Solidity struct type for the App struct
 */
export const appEncoding = abiEncodingForStruct(`
  address addr;
  bytes4 applyAction;
  bytes4 resolve;
  bytes4 getTurnTaker;
  bytes4 isStateTerminal;
`);
