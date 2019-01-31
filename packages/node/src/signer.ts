import { Wallet } from "ethers";
import { fromMnemonic, HDNode } from "ethers/utils/hdnode";

import { IStoreService } from "./services";

const MNEMONIC_PATH = "MNEMONIC";

export async function getHDNode(storeService: IStoreService): Promise<HDNode> {
  let mnemonic = await storeService.get(MNEMONIC_PATH);

  if (!mnemonic) {
    mnemonic = Wallet.createRandom().mnemonic;
    await storeService.set([{ key: MNEMONIC_PATH, value: mnemonic }]);
  }

  return fromMnemonic(mnemonic);
}
