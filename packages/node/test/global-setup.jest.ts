import dotenvExtended from "dotenv-extended";
import { Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { fromMnemonic } from "ethers/utils/hdnode";
import fs from "fs";
import ganache from "ganache-core";
import mkdirp from "mkdirp";
import os from "os";
import path from "path";

import { configureNetworkContext } from "./contract-deployments.jest";
import { A_MNEMONIC, B_MNEMONIC, C_MNEMONIC } from "./test-constants.jest";

dotenvExtended.load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

const CF_PATH = "m/44'/60'/0'/25446";

export default async function globalSetup() {
  mkdirp.sync(DIR);

  const privateKeyA = fromMnemonic(A_MNEMONIC).derivePath(CF_PATH).privateKey;
  const privateKeyB = fromMnemonic(B_MNEMONIC).derivePath(CF_PATH).privateKey;
  const privateKeyC = fromMnemonic(C_MNEMONIC).derivePath(CF_PATH).privateKey;

  const server = ganache.server({
    accounts: [
      { balance: "120000000000000000", secretKey: privateKeyA },
      { balance: "120000000000000000", secretKey: privateKeyB },
      { balance: "120000000000000000", secretKey: privateKeyC }
    ]
  });

  global["ganacheServer"] = server;

  server.listen(parseInt(process.env.GANACHE_PORT!, 10));

  const provider = new Web3Provider(server.provider);

  const wallet = new Wallet(privateKeyA, provider);

  fs.writeFileSync(
    path.join(DIR, "addresses"),
    JSON.stringify(await configureNetworkContext(wallet))
  );
}
