import * as ethers from "ethers";
import { SolidityStruct, SolidityStructType } from "./solidityStruct";

/**
 * Compute the raw state hash for use in the StateChannel contract.
 * @param signingKeys Signing keys of the StateChannel
 * @param appState App state
 * @param appStateNonce App state nonce
 * @param timeout Time until finalization.
 * @returns string 32-byte keccak256 hash
 */
export function computeStateHash(
  signingKeys: string[],
  appState: SolidityStruct,
  appStateNonce: number,
  timeout: number
): string {
  return ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", signingKeys, appStateNonce, timeout, appState.keccak256()]
  );
}

/**
 * Compute the raw action hash for use in the StateChannel contract.
 * @param turnTaker The address of the turn taker
 * @param prevState The previous app state
 * @param action The action
 * @param appStateNonce The app state nonce
 * @param disputeNonce The dispute nonce
 * @returns string 32-byte keccak256 hash
 */
export function computeActionHash(
  turnTaker: string,
  prevState: SolidityStruct,
  action: SolidityStruct,
  appStateNonce: number,
  disputeNonce: number
): string {
  return ethers.utils.solidityKeccak256(
    ["bytes1", "address", "bytes32", "bytes", "uint256", "uint256"],
    [
      "0x19",
      turnTaker,
      prevState.keccak256(),
      action.encodeBytes(),
      appStateNonce,
      disputeNonce
    ]
  );
}

/**
 * Solidity struct type for the Transfer.Terms struct
 */
export const TransferTerms = new SolidityStructType(`
  uint8 assetType;
  uint256 limit;
  address token;
`);

/**
 * Solidity struct type for the App struct
 */
export const App = new SolidityStructType(`
  address addr;
  bytes4 reducer;
  bytes4 resolver;
  bytes4 turnTaker;
  bytes4 isStateFinal;
`);
