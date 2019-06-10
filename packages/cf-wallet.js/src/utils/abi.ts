import { Arrayish, defaultAbiCoder, solidityPack } from "ethers/utils";

/**
 * Returns a hex string of the values encoded as the types.
 * Throws if a value is invalid for the type.
 *
 * @param types Data types
 * @param values Values to encode
 */
export function encode(types: string[], values: any[]) {
  return defaultAbiCoder.encode(types, values);
}

/**
 * Returns an Object by parsing data assuming types, with each parameter accessible as a positional parameters.
 * Throws if data is invalid for the types.
 *
 * @param types Data types
 * @param values Values to decode
 */
export function decode(types: string[], data: Arrayish) {
  return defaultAbiCoder.decode(types, data);
}

/**
 * Compute the Solidity non-standard (tightly) packed data for values given the types.
 *
 * @param types Data types
 * @param values Values to pack
 */
export function encodePacked(types: string[], values: any[]) {
  return solidityPack(types, values);
}
