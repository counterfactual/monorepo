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

const CF_PATH = "m/44'/60'/0'/25446";

module.exports = async () => {
  mkdirp.sync(DIR);

  const playgroundMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyPG = fromMnemonic(playgroundMnemonic).derivePath(CF_PATH)
    .privateKey;

  const aliceMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyA = fromMnemonic(aliceMnemonic).derivePath(CF_PATH)
    .privateKey;

  const botMnemonic = Wallet.createRandom().mnemonic;
  const privateKeyC = fromMnemonic(botMnemonic).derivePath(CF_PATH).privateKey;

  const aliceAddress = fromMnemonic(aliceMnemonic).derivePath(CF_PATH).address;
  const botAddress = fromMnemonic(botMnemonic).derivePath(CF_PATH).address;

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
        secretKey: privateKeyC
      }
    ]
  });

  global["ganacheServer"] = server;

  server.listen(parseInt(process.env.GANACHE_PORT!, 10));

  const provider = new Web3Provider(server.provider);

  const wallet = new Wallet(privateKeyA, provider);

  const networkContext = await configureNetworkContext(wallet);

  const data = {
    playgroundMnemonic,
    aliceMnemonic,
    botMnemonic,
    aliceAddress,
    botAddress,
    networkContext
  };

  fs.writeFileSync(path.join(DIR, "data"), JSON.stringify(data));
};
