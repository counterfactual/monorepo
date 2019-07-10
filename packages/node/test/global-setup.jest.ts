import { Chain } from "@counterfactual/chain";
import dotenvExtended from "dotenv-extended";

import { A_MNEMONIC, B_MNEMONIC, C_MNEMONIC } from "./test-constants.jest";

dotenvExtended.load();

export default async function globalSetup() {
  const chain = new Chain([A_MNEMONIC, B_MNEMONIC, C_MNEMONIC]);
  await chain.createConfiguredChain();
  global["chain"] = chain;
}
