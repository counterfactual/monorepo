import { Wallet } from "ethers";
import { SigningKey } from "ethers/utils";

import { IStoreService } from "./services";

export const PRIVATE_KEY_PATH = "PRIVATE_KEY";

export async function getSigner(
  storeService: IStoreService
): Promise<SigningKey> {
  let privateKey = await storeService.get(PRIVATE_KEY_PATH);
  if (!privateKey) {
    privateKey = Wallet.createRandom().privateKey;
    await storeService.set([{ key: PRIVATE_KEY_PATH, value: privateKey }]);
  }

  return new SigningKey(privateKey);
}
