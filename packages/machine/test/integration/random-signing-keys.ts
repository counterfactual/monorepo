import { hexlify, randomBytes, SigningKey } from "ethers/utils";

export function getSortedRandomSigningKeys(length: number) {
  return Array(length)
    .fill(0)
    .map(_ => new SigningKey(hexlify(randomBytes(32))))
    .sort((a, b) =>
      parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
    );
}
