import * as ethers from "ethers";
import { StructAbiEncoder } from "./structAbiEncoder";

/**
 * Compute the raw state hash for use in the StateChannel contract.
 * @param signingKeys Signing keys of the StateChannel
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
 * Compute the raw action hash for use in the StateChannel contract.
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
  multisigAddress: string,
  nonceSalt: string
) {
  return ethers.utils.solidityKeccak256(
    ["address", "bytes32"],
    [multisigAddress, nonceSalt]
  );
}

/**
 * Solidity struct type for the Transfer.Terms struct
 */
export const TermsEncoder = StructAbiEncoder.fromDefinition(`
  uint8 assetType;
  uint256 limit;
  address token;
`);

/**
 * Solidity struct type for the App struct
 */
export const AppEncoder = StructAbiEncoder.fromDefinition(`
  address addr;
  bytes4 reducer;
  bytes4 resolver;
  bytes4 turnTaker;
  bytes4 isStateFinal;
`);
