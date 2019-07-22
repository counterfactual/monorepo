import { getAddress, recoverAddress, Signature } from "ethers/utils";

import { EthereumCommitment } from "../../ethereum/types";

export function assertIsValidSignature(
  expectedSigner: string,
  commitment?: EthereumCommitment,
  signature?: Signature
) {
  if (commitment === undefined) {
    throw Error("assertIsValidSignature received an undefined commitment");
  }

  if (signature === undefined) {
    throw Error("assertIsValidSignature received an undefined signature");
  }

  const signer = recoverAddress(commitment.hashToSign(), signature);

  if (getAddress(expectedSigner) !== signer) {
    throw Error(
      `Validating a signature with expected signer ${expectedSigner} but recovered ${signer} for commitment hash ${commitment.hashToSign()}.`
    );
  }
}
