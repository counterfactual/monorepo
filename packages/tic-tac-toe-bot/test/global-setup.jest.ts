import dotenvExtended from "dotenv-extended";
import { Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { fromExtendedKey, fromMnemonic } from "ethers/utils/hdnode";
import fs from "fs";
import ganache from "ganache-core";
import mkdirp from "mkdirp";
import os from "os";
import path from "path";

import { deployTestArtifactsToChain } from "./contract-deployments.jest";

dotenvExtended.load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

const CF_PATH = "m/44'/60'/0'/25446";

function generateXPrv() {
  return fromMnemonic(Wallet.createRandom().mnemonic).extendedKey;
}

function getPrivateKey(extendedPrvKey: string) {
  return fromExtendedKey(extendedPrvKey).derivePath(CF_PATH).privateKey;
}

module.exports = async () => {
  mkdirp.sync(DIR);

  const playgroundExtendedPrvKey = generateXPrv();
  const privateKeyPG = getPrivateKey(playgroundExtendedPrvKey);

  const aliceExtendedPrvKey = generateXPrv();
  const privateKeyA = getPrivateKey(aliceExtendedPrvKey);

  const botExtendedPrvKey = generateXPrv();
  const privateKeyC = getPrivateKey(botExtendedPrvKey);

  const aliceAddress = fromExtendedKey(aliceExtendedPrvKey).address;
  const botAddress = fromExtendedKey(botExtendedPrvKey).address;

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

  const networkContext = await deployTestArtifactsToChain(wallet);

  const data = {
    playgroundExtendedPrvKey,
    aliceExtendedPrvKey,
    botExtendedPrvKey,
    aliceAddress,
    botAddress,
    networkContext
  };

  fs.writeFileSync(path.join(DIR, "data"), JSON.stringify(data));
};
