import { computeAddress } from "ethers/utils";
import { fromExtendedPublicKey } from "ethers/utils/hdnode";

export function xpubKthAddress(xpub: string, k: number) {
  return computeAddress(
    fromExtendedPublicKey(xpub).deriveChild(`m/44'/60'/0'/0/${k}`).publicKey
  );
}
