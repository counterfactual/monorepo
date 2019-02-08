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
import {
  MNEMONIC_ALICE,
  MNEMONIC_BOB,
  MNEMONIC_CHARLIE,
  MNEMONIC_PG_SERVER
} from "./mock-data";

dotenvExtended.load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

// This runs once for all test suites.

module.exports = async () => {
  mkdirp.sync(DIR);

  const privateKeyPG = fromMnemonic(MNEMONIC_PG_SERVER).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;
  const privateKeyA = fromMnemonic(MNEMONIC_ALICE).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;
  const privateKeyB = fromMnemonic(MNEMONIC_BOB).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;
  const privateKeyC = fromMnemonic(MNEMONIC_CHARLIE).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;

  const server = ganache.server({
    accounts: [
      {
        balance: "120000000000000000",
        secretKey: privateKeyPG
      },
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
