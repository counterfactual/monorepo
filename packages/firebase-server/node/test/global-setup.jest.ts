import dotenvExtended from "dotenv-extended";
import { Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { parseEther } from "ethers/utils";
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

export const CF_PATH = "m/44'/60'/0'/25446";

export default async function globalSetup() {
  mkdirp.sync(DIR);

  const privateKeyA = fromMnemonic(A_MNEMONIC).derivePath(CF_PATH).privateKey;
  const privateKeyB = fromMnemonic(B_MNEMONIC).derivePath(CF_PATH).privateKey;
  const privateKeyC = fromMnemonic(C_MNEMONIC).derivePath(CF_PATH).privateKey;
  const fundedPrivateKey = Wallet.createRandom().privateKey;

  const server = ganache.server({
    accounts: [
      { balance: parseEther("1000").toString(), secretKey: privateKeyA },
      { balance: parseEther("1000").toString(), secretKey: privateKeyB },
      { balance: parseEther("1000").toString(), secretKey: privateKeyC },
      { balance: parseEther("1000").toString(), secretKey: fundedPrivateKey }
    ],
    gasLimit: "0xfffffffffff",
    gasPrice: "0x01"
  });

  global["ganacheServer"] = server;

  server.listen(parseInt(process.env.GANACHE_PORT!, 10));

  const provider = new Web3Provider(server.provider);

  const wallet = new Wallet(privateKeyA, provider);

  fs.writeFileSync(
    path.join(DIR, "accounts"),
    JSON.stringify({
      fundedPrivateKey,
      contractAddresses: await configureNetworkContext(wallet)
    })
  );
}
