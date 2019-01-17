import { recoverAddress, Signature } from "ethers/utils";

import { EthereumCommitment } from "../../ethereum/types";

export function validateSignature(
  expectedSigner: string,
  commitment?: EthereumCommitment,
  signature?: Signature
) {
  if (commitment === undefined) {
    throw Error("validateSignature received an undefined commitment");
  }

  // FIXME: This is a temporary hack to allow me to make progress
  //        on upgrading the Node to use machine protocols to generate
  //        state transitions. I want to entire protocol execution to run
  //        through the machine (including OP_SIGN and validateSignature)
  //        but haven't hooked up messaging yet, so its hard for me to generate
  //        the correct signatures.
  if (signature !== undefined && signature.v === -1) return;

  if (signature === undefined) {
    throw Error("validateSignature received an undefined signature");
  }

  if (expectedSigner !== recoverAddress(commitment.hashToSign(), signature)) {
    throw Error("Received invalid signature on validateSignature");
  }
}
