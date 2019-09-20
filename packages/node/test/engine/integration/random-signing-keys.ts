import { HDNode, hexlify, randomBytes, SigningKey } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";

import { computeRandomExtendedPrvKey } from "../../../src/engine/xkeys";

export function getSortedRandomSigningKeys(length: number) {
  // tslint:disable-next-line:prefer-array-literal
  return Array(length)
    .fill(0)
    .map(_ => new SigningKey(hexlify(randomBytes(32))))
    .sort((a, b) =>
      parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
    );
}

export function extendedPrvKeyToExtendedPubKey(extendedPrvKey: string): string {
  return fromExtendedKey(extendedPrvKey).neuter().extendedKey;
}

export function getRandomExtendedPubKey(): string {
  return extendedPrvKeyToExtendedPubKey(computeRandomExtendedPrvKey());
}

export function getRandomExtendedPubKeys(length: number): string[] {
  return Array(length)
    .fill(0)
    .map(getRandomExtendedPubKey);
}

export function getRandomExtendedPrvKeys(length: number): string[] {
  return Array(length)
    .fill(0)
    .map(computeRandomExtendedPrvKey);
}

export function getRandomHDNodes(length: number): HDNode.HDNode[] {
  return getRandomExtendedPrvKeys(length).map(x => fromExtendedKey(x));
}
