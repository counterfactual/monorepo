import { Arrayish, defaultAbiCoder, solidityPack } from "ethers/utils";

export function encode(types: string[], values: any[]) {
  return defaultAbiCoder.encode(types, values);
}

export function decode(types: string[], data: Arrayish) {
  return defaultAbiCoder.decode(types, data);
}

export function encodePacked(types: string[], values: any[]) {
  return solidityPack(types, values);
}
