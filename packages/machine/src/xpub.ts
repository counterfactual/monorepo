import { computeAddress } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";

export function xpubKthAddress(xpub: string, k: number) {
  return computeAddress(
    fromExtendedKey(xpub).derivePath(`m/44'/60'/0'/0/${k}`).publicKey
  );
}
