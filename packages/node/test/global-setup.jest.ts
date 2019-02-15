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

dotenvExtended.load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

// This runs once for all test suites.

module.exports = async () => {
  mkdirp.sync(DIR);

  const privateKeyA = fromMnemonic(process.env.A_MNEMONIC!).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;
  const privateKeyB = fromMnemonic(process.env.B_MNEMONIC!).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;
  const privateKeyC = fromMnemonic(process.env.C_MNEMONIC!).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;

  const server = ganache.server({
    accounts: [
      {
        balance: "120000000000000000",
        secretKey: privateKeyA
      },
      {
        balance: "120000000000000000",
        secretKey: privateKeyB
      },
      {
        balance: "120000000000000000",
        secretKey: privateKeyC
      }
    ]
  });
  // @ts-ignore
  global.ganacheServer = server;
  server.listen(parseInt(process.env.GANACHE_PORT!, 10));
  const provider = new Web3Provider(server.provider);

  const wallet = new Wallet(privateKeyA, provider);

  fs.writeFileSync(
    path.join(DIR, "addresses"),
    JSON.stringify(await configureNetworkContext(wallet))
  );
};
