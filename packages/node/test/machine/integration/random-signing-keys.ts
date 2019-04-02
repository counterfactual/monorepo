import { Wallet } from "ethers";
import { hexlify, randomBytes, SigningKey } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";

export function getSortedRandomSigningKeys(length: number) {
  return Array(length)
    .fill(0)
    .map(_ => new SigningKey(hexlify(randomBytes(32))))
    .sort((a, b) =>
      parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
    );
}

export function getRandomHDNodes(length: number) {
  return Array(length)
    .fill(0)
    .map(_ => fromMnemonic(Wallet.createRandom().mnemonic));
}

export function getRandomExtendedKeys(length: number) {
  return getRandomHDNodes(length).map(x => x.extendedKey);
}
