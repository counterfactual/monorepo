import * as ethers from "ethers";
import { Bytes, H256, NetworkContext } from "../../types";

import AppInstance from "@counterfactual/contracts/build/contracts/AppInstance.json";
import Registry from "@counterfactual/contracts/build/contracts/Registry.json";

/**
 * Returns the calldata for a call to `registry` that looks up `appCfAddr` and
 * calls the resulting address's `setState` function with the provided `appStateHash`,
 * `appLocalNonce`, `timeout` and `signatures`
 */
export function proxyCallSetStateData(
  networkContext: NetworkContext,
  appStateHash: H256,
  appCfAddr: H256,
  appLocalNonce: number,
  timeout: number,
  signatures: Bytes
): Bytes {
  return new ethers.utils.Interface(Registry.abi).functions.proxyCall.encode([
    networkContext.Registry,
    appCfAddr,
    new ethers.utils.Interface(AppInstance.abi).functions.setState.encode([
      appStateHash,
      appLocalNonce,
      timeout,
      signatures
    ])
  ]);
}
