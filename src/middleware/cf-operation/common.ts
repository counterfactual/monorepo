import * as ethers from "ethers";
import { Address, Bytes, H256 } from "../../types";
import { Abi } from "./types";

/**
 * Returns the calldata for a call to `registry` that looks up `appCfAddr` and
 * calls the resulting address's `setState` function with the provided `appStateHash`,
 * `appLocalNonce`, `timeout` and `signatures`
 */
export function proxyCallSetStateData(
  appStateHash: H256,
  appCfAddr: H256,
  appLocalNonce: number,
  timeout: number,
  signatures: Bytes,
  registry: Address
): Bytes {
  return new ethers.utils.Interface([Abi.proxyCall]).functions.proxyCall.encode(
    [
      registry,
      appCfAddr,
      new ethers.utils.Interface([Abi.setState]).functions.setState.encode([
        appStateHash,
        appLocalNonce,
        timeout,
        signatures
      ])
    ]
  );
}
