import { LocalGanacheServer } from "@counterfactual/local-ganache-server";
import dotenvExtended from "dotenv-extended";

import { A_MNEMONIC, B_MNEMONIC, C_MNEMONIC } from "./test-constants.jest";

dotenvExtended.load();

export default async function globalSetup() {
  const chain = new LocalGanacheServer([A_MNEMONIC, B_MNEMONIC, C_MNEMONIC]);
  await chain.runMigrations();
  global["chain"] = chain;
}
