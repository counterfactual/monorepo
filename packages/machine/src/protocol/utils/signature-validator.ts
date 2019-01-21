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

  if (signature === undefined) {
    throw Error("validateSignature received an undefined signature");
  }

  if (expectedSigner !== recoverAddress(commitment.hashToSign(), signature)) {
    throw Error("Received invalid signature on validateSignature");
  }
}
