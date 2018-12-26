import { Bytes32 } from "@counterfactual/types";
import {
  BigNumber,
  joinSignature,
  recoverAddress,
  Signature
} from "ethers/utils";

export function signaturesToBytes(...signatures: Signature[]): string {
  const signaturesHexString = signatures
    .map(joinSignature)
    .map(s => s.substr(2))
    .join("");
  return `0x${signaturesHexString}`;
}

export function signaturesToSortedBytes(
  digest: Bytes32,
  ...signatures: Signature[]
): string {
  const sigs = signatures.slice();
  sigs.sort((sigA, sigB) => {
    const addrA = recoverAddress(digest, signaturesToBytes(sigA));
    const addrB = recoverAddress(digest, signaturesToBytes(sigB));
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return signaturesToBytes(...sigs);
}
