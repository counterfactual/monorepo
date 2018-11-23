import * as ethers from "ethers";

import { Address } from "./utils";

/**
 * A network context is a set of addresses at which global contracts are
 * deployed. A global contract provides functionality in such a way that
 * all channels can use the same global contract, hence they only need to be
 * deployed once. Examples of non-global contracts are the Multisig and
 * the AppInstance contracts.
 *
 * @function linkedBytecode Given bytecode in solc's pre-linkage format (where
 * global contract addresses are replaced with placeholders of the form
 * `__<ContractName>______`; see the description of "placeholder" at
 * https://solidity.readthedocs.io/en/v0.4.24/contracts.html#libraries), return
 * the linked bytecode after linking with the list of addresses.
 */
export class NetworkContext {
  // FIXME: This is just bad practice :S
  // https://github.com/counterfactual/monorepo/issues/143
  private contractToVar = {
    Registry: "registryAddr",
    PaymentApp: "paymentAppAddr",
    ConditionalTransaction: "conditionalTransactionAddr",
    MultiSend: "multiSendAddr",
    NonceRegistry: "nonceRegistryAddr",
    Signatures: "signaturesAddr",
    StaticCall: "staticCallAddr",
    ETHBalanceRefundApp: "ethBalanceRefundAppAddr"
  };

  constructor(
    readonly registryAddr: Address,
    readonly paymentAppAddr: Address,
    readonly conditionalTransactionAddr: Address,
    readonly multiSendAddr: Address,
    readonly nonceRegistryAddr: Address,
    readonly signaturesAddr: Address,
    readonly staticCallAddr: Address,
    readonly ethBalanceRefundAppAddr: Address
  ) {}

  public linkedBytecode(unlinkedBytecode: string): string {
    let bytecode = unlinkedBytecode;
    for (const contractName in this.contractToVar) {
      const regex = new RegExp(`__${contractName}_+`, "g");
      const address = this[this.contractToVar[contractName]].substr(2);
      bytecode = bytecode.replace(regex, address);
    }
    return bytecode;
  }
}

export const EMPTY_NETWORK_CONTEXT = new NetworkContext(
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero
);
