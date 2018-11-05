import MinimumViableMultisigJson from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import * as ethers from "ethers";

import * as abi from "../../abi";
import { Address } from "../../types";
import { NetworkContext, Signature } from "../../utils";

import {
  CfFreeBalance,
  CfNonce,
  CfOperation,
  MultisigInput,
  Transaction
} from "./types";

const { keccak256 } = ethers.utils;

export abstract class CfMultisigTxOp extends CfOperation {
  abstract multisigInput(): MultisigInput;

  constructor(
    readonly multisig: Address,
    readonly cfFreeBalance: CfFreeBalance
  ) {
    super();
  }

  public transaction(sigs: Signature[]): Transaction {
    const multisigInput = this.multisigInput();
    const signatureBytes = Signature.toSortedBytes(sigs, this.hashToSign());
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
    const owners = [this.cfFreeBalance.alice, this.cfFreeBalance.bob];
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
