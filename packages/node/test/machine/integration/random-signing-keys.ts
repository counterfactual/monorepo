import { HDNode, hexlify, randomBytes, SigningKey } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";

import { computeRandomExtendedKey } from "../../../src/machine/xkeys";

export function getSortedRandomSigningKeys(length: number) {
  // tslint:disable-next-line:prefer-array-literal
  return Array(length)
    .fill(0)
    .map(_ => new SigningKey(hexlify(randomBytes(32))))
    .sort((a, b) =>
      parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
    );
}

export function getXPubsFromExtendedKeys(xkeys: string[]): string[] {
  return xkeys.map(x => fromExtendedKey(x).neuter().extendedKey);
}

export function getRandomNeuteredExtendedKeys(length: number): string[] {
  return getRandomExtendedKeys(length).map(
    x => fromExtendedKey(x).neuter().extendedKey
  );
}

export function getRandomExtendedKeys(length: number): string[] {
  return Array(length)
    .fill(0)
    .map(_ => computeRandomExtendedKey());
}

export function getRandomHDNodes(length: number): HDNode.HDNode[] {
  return getRandomExtendedKeys(length).map(x => fromExtendedKey(x));
}
