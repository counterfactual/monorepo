import { getAddress, recoverAddress, Signature } from "ethers/utils";

import { EthereumCommitment } from "../../ethereum/types";

export function validateSignature(
  expectedSigner: string,
  commitment?: EthereumCommitment,
  signature?: Signature,
  signerIsIntermediary?: boolean
) {
  if (commitment === undefined) {
    throw Error("validateSignature received an undefined commitment");
  }

  if (signature === undefined) {
    throw Error("validateSignature received an undefined signature");
  }

  const signer = recoverAddress(
    commitment.hashToSign(signerIsIntermediary),
    signature
  );

  if (getAddress(expectedSigner) !== signer) {
    throw Error(
      `Validating a signature with expected signer ${expectedSigner} but recovered ${signer} for commitment hash ${commitment.hashToSign()}`
    );
  }
}
