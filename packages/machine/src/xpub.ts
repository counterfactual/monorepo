import { computeAddress, SigningKey } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";

function sortAddresses(addrs: string[]) {
  return addrs.sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1));
}

function sortSigningkeys(addrs: SigningKey[]) {
  return addrs.sort((a, b) =>
    parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
  );
}

export function xpubKthAddress(xpub: string, k: number) {
  return computeAddress(xpubKthHDNode(xpub, k).publicKey);
}

export function xpubKthHDNode(xpub: string, k: number) {
  return fromExtendedKey(xpub).derivePath(`m/44'/60'/0'/0/${k}`);
}

export function xpubsToSortedKthAddresses(xpubs: string[], k: number) {
  return sortAddresses(xpubs.map(xpub => xpubKthAddress(xpub, k)));
}

export function xpubsToSortedKthSigningKeys(xpubs: string[], k: number) {
  return sortSigningkeys(
    xpubs.map(xpub => new SigningKey(xpubKthHDNode(xpub, k).privateKey))
  );
}
