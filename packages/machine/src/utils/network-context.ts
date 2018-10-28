import lodash from "lodash";

import { Address } from "../types";

/**
 * A network context is a set of contract wrappers of the global contracts that
 * are deployed. A global contract provides functionality in such a way that all
 * channels can use the same global contract, hence they only need to be
 * deployed once. The exceptions to the global contracts are the Multisig
 * and the AppInstance contracts.
 *
 * @Param contractArtifacts Mapping of contract name to string list of
 * [abi, bytecode]
 */
export class NetworkContext {
  // FIXME: This is just bad practice :S
  // https://github.com/counterfactual/monorepo/issues/177
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

  public linkBytecode(unlinkedBytecode: string): string {
    let bytecode = unlinkedBytecode;
    for (const contractName of lodash.keys(this.contractToVar)) {
      const regex = new RegExp(`__${contractName}_+`, "g");
      const address = this[this.contractToVar[contractName]].substr(2);
      bytecode = bytecode.replace(regex, address);
    }
    return bytecode;
  }
}
