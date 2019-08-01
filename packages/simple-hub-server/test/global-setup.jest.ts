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

export default async function() {
  mkdirp.sync(DIR);

  // TODO: use @counterfactual/local-ganache-server to remove most of this setup
  const pgXPrv = generateXPrv();
  const privateKeyPG = getPrivateKey(pgXPrv);

  const nodeAXPrv = generateXPrv();
  const privateKeyA = getPrivateKey(nodeAXPrv);

  const nodeBXPrv = generateXPrv();
  const privateKeyB = getPrivateKey(nodeBXPrv);

  const nodeCXPrv = generateXPrv();
  const privateKeyC = getPrivateKey(nodeCXPrv);

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

  global["ganacheServer"] = server;

  server.listen(parseInt(process.env.GANACHE_PORT!, 10));

  const provider = new Web3Provider(server.provider);

  const wallet = new Wallet(privateKeyA, provider);

  const networkContext = await deployTestArtifactsToChain(wallet);
  const data = {
    pgXPrv,
    nodeAXPrv,
    nodeBXPrv,
    nodeCXPrv,
    networkContext
  };

  fs.writeFileSync(path.join(DIR, "data"), JSON.stringify(data));
}
