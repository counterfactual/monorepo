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

  const botMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyPG = fromMnemonic(botMnemonic).derivePath("m/44'/60'/0'/25446")
    .privateKey;

  const nodeAMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyA = fromMnemonic(nodeAMnemonic).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;

  const nodeBMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyB = fromMnemonic(nodeBMnemonic).derivePath(
    "m/44'/60'/0'/25446"
  ).privateKey;

  const nodeCMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyC = fromMnemonic(nodeCMnemonic).derivePath(
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

  const networkContext = await configureNetworkContext(wallet);
  const data = {
    botMnemonic,
    nodeAMnemonic,
    nodeBMnemonic,
    nodeCMnemonic,
    networkContext
  };

  fs.writeFileSync(path.join(DIR, "data"), JSON.stringify(data));
};
