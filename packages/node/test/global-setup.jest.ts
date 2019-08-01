import { LocalGanacheServer } from "@counterfactual/local-ganache-server";
import dotenvExtended from "dotenv-extended";

import {
  A_EXTENDED_KEY,
  B_EXTENDED_KEY,
  C_EXTENDED_KEY
} from "./test-constants.jest";

dotenvExtended.load();

export default async function globalSetup() {
  const chain = new LocalGanacheServer([
    A_EXTENDED_KEY,
    B_EXTENDED_KEY,
    C_EXTENDED_KEY
  ]);
  await chain.xprv();
  global["chain"] = chain;
}
