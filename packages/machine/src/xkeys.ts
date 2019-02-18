import { computeAddress, SigningKey } from "ethers/utils";
import { fromExtendedKey, HDNode } from "ethers/utils/hdnode";

/**
 * Helpful info:
 *
 * BIP-32 specified HD Wallets
 * BIP-39 specifies how to convert mnemonic to/from entropy and mnemonic to seed
 * BIP-43 specifies that the first field should be purpose (i.e. "m / purpose'")
 * BIP-44 specifies that if the purpose is 44, then the format is "m / purpose' / cointype' / account' / change / index"
 */

export function sortAddresses(addrs: string[]): string[] {
  return addrs.sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1));
}

function sortSigningkeys(addrs: SigningKey[]): SigningKey[] {
  return addrs.sort((a, b) =>
    parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
  );
}

const memo1 = new Map<string, string>();
export function xkeyKthAddress(xkey: string, k: number): string {
  if (memo1.has(xkey + k.toString())) {
    return memo1.get(xkey + k.toString())!;
  }
  const ret = computeAddress(xkeyKthHDNode(xkey, k).publicKey);
  memo1.set(xkey + k.toString(), ret);
  return ret;
}

const memo2 = new Map<string, HDNode>();
export function xkeyKthHDNode(xkey: string, k: number): HDNode {
  if (memo2.has(xkey + k.toString())) {
    return memo2.get(xkey + k.toString())!;
  }
  const ret = fromExtendedKey(xkey).derivePath(`${k}`);
  memo2.set(xkey + k.toString(), ret);
  return ret;
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
