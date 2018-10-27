import AppInstanceJson from "@counterfactual/contracts/build/contracts/AppInstance.json";
import RegistryJson from "@counterfactual/contracts/build/contracts/Registry.json";
import * as ethers from "ethers";

import { Bytes, H256, NetworkContext } from "../../types";

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
  return new ethers.utils.Interface(
    RegistryJson.abi
  ).functions.proxyCall.encode([
    networkContext.registryAddr,
    appCfAddr,
    new ethers.utils.Interface(AppInstanceJson.abi).functions.setState.encode([
      appStateHash,
      appLocalNonce,
      timeout,
      signatures
    ])
  ]);
}
