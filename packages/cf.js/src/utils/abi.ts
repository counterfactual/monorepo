import * as ethers from "ethers";

export function encode(types: string[], values: any[]) {
  return ethers.utils.defaultAbiCoder.encode(types, values);
}

export function decode(types: string[], data: ethers.utils.Arrayish) {
  return ethers.utils.defaultAbiCoder.decode(types, data);
}

export function encodePacked(types: string[], values: any[]) {
  return ethers.utils.solidityPack(types, values);
}

export function keccak256(encodePacked: string): string {
  return ethers.utils.keccak256(encodePacked);
}
