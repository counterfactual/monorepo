import * as ethers from "ethers";
import { SolidityStruct, SolidityStructType } from "./solidityStruct";

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

export const TransferTerms = new SolidityStructType(`
  uint8 assetType;
  uint256 limit;
  address token;
`);

export const App = new SolidityStructType(`
  address addr;
  bytes4 reducer;
  bytes4 resolver;
  bytes4 turnTaker;
  bytes4 isStateFinal;
`);
