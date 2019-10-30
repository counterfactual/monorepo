import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import Proxy from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/Proxy.json";
import {
  getAddress,
  Interface,
  keccak256,
  solidityKeccak256
} from "ethers/utils";

import { xkeysToSortedKthAddresses } from "../machine/xkeys";

/**
 * Computes the address of a counterfactual MinimumViableMultisig contract
 * as it would be if deployed via the `createProxyWithNonce` method on a
 * ProxyFactory contract with the bytecode of a Proxy contract pointing to
 * a `masterCopy` of a MinimumViableMultisig contract.
 *
 * See https://solidity.readthedocs.io/en/v0.5.11/assembly.html?highlight=create2
 * for information on how CREAT2 addresses are calculated.
 *
 * @export
 * @param {string[]} owners - the addresses of the owners of the multisig
 * @param {string} proxyFactoryAddress - address of ProxyFactory library
 * @param {string} minimumViableMultisigAddress - address of masterCopy of multisig
 *
 * @returns {string} the address of the multisig
 */
// FIXME: More general caching strategy -- don't keep doing this
const cache = {} as any;
export function getCreate2MultisigAddress(
  owners: string[],
  proxyFactoryAddress: string,
  minimumViableMultisigAddress: string
): string {
  const cacheKey = owners + proxyFactoryAddress + minimumViableMultisigAddress;

  cache[cacheKey] =
    cache[cacheKey] ||
    getAddress(
      solidityKeccak256(
        ["bytes1", "address", "uint256", "bytes32"],
        [
          "0xff",
          proxyFactoryAddress,
          solidityKeccak256(
            ["bytes32", "uint256"],
            [
              keccak256(
                new Interface(MinimumViableMultisig.abi).functions.setup.encode(
                  [xkeysToSortedKthAddresses(owners, 0)]
                )
              ),
              0
            ]
          ),
          solidityKeccak256(
            ["bytes", "uint256"],
            [`0x${Proxy.evm.bytecode.object}`, minimumViableMultisigAddress]
          )
        ]
      ).slice(-40)
    );

  return cache[cacheKey];
}
