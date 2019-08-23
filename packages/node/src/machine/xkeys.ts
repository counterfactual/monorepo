import { Wallet } from "ethers";
import { computeAddress, SigningKey } from "ethers/utils";
import { fromExtendedKey, fromMnemonic, HDNode } from "ethers/utils/hdnode";

/**
 * Helpful info:
 *
 * BIP-32 specified HD Wallets
 * BIP-39 specifies how to convert mnemonic to/from entropy and mnemonic to seed
 * BIP-43 specifies that the first field should be purpose (i.e. "m / purpose'")
 * BIP-44 specifies that if the purpose is 44, then the format is "m / purpose' / cointype' / account' / change / index"
 */

export function computeRandomExtendedPrvKey(): string {
  return fromMnemonic(Wallet.createRandom().mnemonic).extendedKey;
}

export function sortAddresses(addrs: string[]): string[] {
  return addrs.sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1));
}

function sortSigningkeys(addrs: SigningKey[]): SigningKey[] {
  return addrs.sort((a, b) =>
    parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
  );
}

const xkeyKthAddressCache = {} as any;
export function xkeyKthAddress(xkey: string, k: number): string {
  if (!xkeyKthAddressCache[xkey]) {
    xkeyKthAddressCache[xkey] = {};
  }
  if (!xkeyKthAddressCache[xkey][k]) {
    xkeyKthAddressCache[xkey][k] = computeAddress(
      xkeyKthHDNode(xkey, k).publicKey
    );
  }
  return xkeyKthAddressCache[xkey][k];
}

const xkeyKthNodeCache = {} as any;
export function xkeyKthHDNode(xkey: string, k: number): HDNode {
  if (!xkeyKthNodeCache[xkey]) {
    xkeyKthNodeCache[xkey] = {};
  }
  if (!xkeyKthNodeCache[xkey][k]) {
    xkeyKthNodeCache[xkey][k] = fromExtendedKey(xkey).derivePath(`${k}`);
  }
  return xkeyKthNodeCache[xkey][k];
}

export function xkeysToSortedKthAddresses(
  xkeys: string[],
  k: number
): string[] {
  return sortAddresses(xkeys.map(xkey => xkeyKthAddress(xkey, k)));
}

export function xkeysToSortedKthSigningKeys(
  xkeys: string[],
  k: number
): SigningKey[] {
  return sortSigningkeys(
    xkeys.map(xkey => new SigningKey(xkeyKthHDNode(xkey, k).privateKey))
  );
}
