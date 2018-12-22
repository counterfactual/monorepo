import {
  BigNumber,
  joinSignature,
  recoverAddress,
  Signature
} from "ethers/utils";

export function signaturesToBytes(...signatures: Signature[]): string {
  return signatures
    .map(joinSignature)
    .map(s => s.substr(2))
    .reduce((acc, v) => acc + v, "0x");
}

export function signaturesToSortedBytes(
  digest: string,
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
