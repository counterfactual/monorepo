import {
  BigNumber,
  bigNumberify,
  joinSignature,
  recoverAddress,
  Signature
} from "ethers/utils";

import { JSON_STRINGIFY_SPACE } from "../constants";

import { getCreate2MultisigAddress } from "./create2-address";

export { getCreate2MultisigAddress };

export function getFirstElementInListNotEqualTo(test: string, list: string[]) {
  return list.filter(x => x !== test)[0];
}

export function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const bigNumberifyJson = (json: object) =>
  JSON.parse(JSON.stringify(json), (
    // @ts-ignore
    key,
    val
  ) => (val && val["_hex"] ? bigNumberify(val) : val));

/**
 * Converts an array of signatures into a single string
 *
 * @param signatures An array of etherium signatures
 */
export function signaturesToBytes(...signatures: Signature[]): string {
  return signatures
    .map(joinSignature)
    .map(s => s.substr(2))
    .reduce((acc, v) => acc + v, "0x");
}

/**
 * Sorts signatures in ascending order of signer address
 *
 * @param signatures An array of etherium signatures
 */
export function sortSignaturesBySignerAddress(
  digest: string,
  signatures: Signature[]
): Signature[] {
  const ret = signatures.slice();
  ret.sort((sigA, sigB) => {
    const addrA = recoverAddress(digest, signaturesToBytes(sigA));
    const addrB = recoverAddress(digest, signaturesToBytes(sigB));
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return ret;
}

/**
 * Sorts signatures in ascending order of signer address
 * and converts them into bytes
 *
 * @param signatures An array of etherium signatures
 */
export function signaturesToBytesSortedBySignerAddress(
  digest: string,
  ...signatures: Signature[]
): string {
  return signaturesToBytes(
    ...sortSignaturesBySignerAddress(digest, signatures)
  );
}

export function prettyPrintObject(object: any) {
  return JSON.stringify(object, null, JSON_STRINGIFY_SPACE);
}
