import * as ethers from "ethers";

import { Bytes32 } from "../simple-types";

export function signaturesToBytes(
  ...signatures: ethers.utils.Signature[]
): string {
  const signaturesHexString = signatures
    .map(ethers.utils.joinSignature)
    .map(s => s.substr(2))
    .join("");
  return `0x${signaturesHexString}`;
}

export function signaturesToSortedBytes(
  digest: Bytes32,
  ...signatures: ethers.utils.Signature[]
): string {
  const sigs = signatures.slice();
  sigs.sort((sigA, sigB) => {
    const addrA = ethers.utils.recoverAddress(digest, signaturesToBytes(sigA));
    const addrB = ethers.utils.recoverAddress(digest, signaturesToBytes(sigB));
    return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return signaturesToBytes(...sigs);
}
