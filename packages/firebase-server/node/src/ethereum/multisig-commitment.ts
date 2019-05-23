import { utils } from "@counterfactual/cf.js";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import { Interface, keccak256, Signature, solidityPack } from "ethers/utils";

import { EthereumCommitment, MultisigTransaction, Transaction } from "./types";
const { signaturesToBytesSortedBySignerAddress } = utils;

/// A commitment to make MinimumViableMultisig perform a message call
export abstract class MultisigCommitment extends EthereumCommitment {
  constructor(
    readonly multisigAddress: string,
    readonly multisigOwners: string[]
  ) {
    super();
  }

  abstract getTransactionDetails(): MultisigTransaction;

  public transaction(sigs: Signature[]): Transaction {
    const multisigInput = this.getTransactionDetails();

    const signatureBytes = signaturesToBytesSortedBySignerAddress(
      this.hashToSign(),
      ...sigs
    );

    const txData = new Interface(
      MinimumViableMultisig.abi
    ).functions.execTransaction.encode([
      multisigInput.to,
      multisigInput.value,
      multisigInput.data,
      multisigInput.operation,
      signatureBytes
    ]);

    // TODO: Deterministically compute `to` address
    return { to: this.multisigAddress, value: 0, data: txData };
  }

  public hashToSign(): string {
    const { to, value, data, operation } = this.getTransactionDetails();
    return keccak256(
      solidityPack(
        ["bytes1", "address[]", "address", "uint256", "bytes", "uint8"],
        ["0x19", this.multisigOwners, to, value, data, operation]
      )
    );
  }
}
