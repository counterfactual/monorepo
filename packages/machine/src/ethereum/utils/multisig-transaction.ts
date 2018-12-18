import MinimumViableMultisig from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import { defaultAbiCoder, Interface, keccak256, Signature } from "ethers/utils";

import { signaturesToSortedBytes } from "../utils/signature";

import { EthereumCommitment, MultisigTransaction, Transaction } from "./types";

export abstract class MultisigTransactionCommitment extends EthereumCommitment {
  constructor(
    readonly multisigAddress: string,
    readonly multisigOwners: string[]
  ) {
    super();
  }

  abstract getTransactionDetails(): MultisigTransaction;

  public transaction(sigs: Signature[]): Transaction {
    const multisigInput = this.getTransactionDetails();

    const signatureBytes = signaturesToSortedBytes(this.hashToSign(), ...sigs);

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
      defaultAbiCoder.encode(
        ["bytes1", "address[]", "address", "uint256", "bytes", "uint8"],
        ["0x19", this.multisigOwners, to, value, data, operation]
      )
    );
  }
}
