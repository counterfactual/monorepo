import * as cf from "@counterfactual/cf.js";
import MinimumViableMultisigJson from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import * as ethers from "ethers";

import { ProtocolOperation, MultisigInput, Transaction } from "./types";

const { keccak256 } = ethers.utils;
const { abi } = cf.utils;

export abstract class MultisigTxOp extends ProtocolOperation {
  abstract multisigInput(): MultisigInput;

  constructor(
    readonly multisig: cf.utils.Address,
    readonly freeBalance: cf.utils.FreeBalance
  ) {
    super();
  }

  public transaction(sigs: cf.utils.Signature[]): Transaction {
    const multisigInput = this.multisigInput();
    const signatureBytes = cf.utils.Signature.toSortedBytes(
      sigs,
      this.hashToSign()
    );
    const txData = new ethers.utils.Interface(
      MinimumViableMultisigJson.abi
    ).functions.execTransaction.encode([
      multisigInput.to,
      multisigInput.val,
      multisigInput.data,
      multisigInput.op,
      signatureBytes
    ]);
    return new Transaction(this.multisig, 0, txData);
  }

  public hashToSign(): string {
    const multisigInput = this.multisigInput();
    const owners = [this.freeBalance.alice, this.freeBalance.bob];
    return keccak256(
      abi.encodePacked(
        ["bytes1", "address[]", "address", "uint256", "bytes", "uint8"],
        [
          "0x19",
          owners,
          multisigInput.to,
          multisigInput.val,
          multisigInput.data,
          multisigInput.op
        ]
      )
    );
  }
}
