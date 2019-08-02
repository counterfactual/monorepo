import { Node } from "@counterfactual/types";
import { fromExtendedKey, HDNode } from "ethers/utils/hdnode";

import { CF_PATH } from "./constants";
import { computeRandomExtendedPrvKey } from "./machine/xkeys";

export const EXTENDED_PRIVATE_KEY_PATH = "EXTENDED_PRIVATE_KEY";

export async function getHDNode(
  storeService: Node.IStoreService
): Promise<HDNode> {
  let xprv = await storeService.get(EXTENDED_PRIVATE_KEY_PATH);

  if (!xprv) {
    xprv = computeRandomExtendedPrvKey();
    await storeService.set([{ key: EXTENDED_PRIVATE_KEY_PATH, value: xprv }]);
  }

  try {
    return fromExtendedKey(xprv).derivePath(CF_PATH);
  } catch (e) {
    throw new Error(`Invalid extended key supplied: ${e}`);
  }
}
