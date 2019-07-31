import { Node } from "@counterfactual/types";
import { fromExtendedKey, HDNode } from "ethers/utils/hdnode";

import { computeRandomExtendedKey } from "./machine/xkeys";

export const EXTENDED_KEY_PATH = "EXTENDED_KEY";

export async function getHDNode(
  storeService: Node.IStoreService
): Promise<HDNode> {
  let extendedKey = await storeService.get(EXTENDED_KEY_PATH);

  if (!extendedKey) {
    extendedKey = computeRandomExtendedKey();
    await storeService.set([{ key: EXTENDED_KEY_PATH, value: extendedKey }]);
  }

  try {
    // 25446 is 0x6366... or "cf" in ascii, for "Counterfactual".
    return fromExtendedKey(extendedKey).derivePath("m/44'/60'/0'/25446");
  } catch (e) {
    throw new Error(`Invalid extended key supplied: ${e}`);
  }
}
