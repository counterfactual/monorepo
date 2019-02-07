import dotenvExtended from "dotenv-extended";
import { Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import fs from "fs";
import ganache from "ganache-core";
import mkdirp from "mkdirp";
import os from "os";
import path from "path";

import { configureNetworkContext } from "./contract-deployments.jest";

dotenvExtended.load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

module.exports = async () => {
  mkdirp.sync(DIR);

  const server = ganache.server({
    accounts: [
      {
        balance: "120000000000000000",
        secretKey: process.env.PRIVATE_KEY_A
      },
      {
        balance: "120000000000000000",
        secretKey: process.env.PRIVATE_KEY_B
      },
      {
        balance: "120000000000000000",
        secretKey: process.env.PRIVATE_KEY_C
      }
    ]
  });
  // @ts-ignore
  global.ganacheServer = server;
  server.listen(parseInt(process.env.GANACHE_PORT!, 10));
  const provider = new Web3Provider(server.provider);
  const wallet = new Wallet(process.env.PRIVATE_KEY_A!, provider);

  fs.writeFileSync(
    path.join(DIR, "networkContext"),
    JSON.stringify(await configureNetworkContext(wallet))
  );
};
