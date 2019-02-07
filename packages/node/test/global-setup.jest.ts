import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import dotenvExtended from "dotenv-extended";
import { ContractFactory, Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import fs from "fs";
import ganache from "ganache-core";
import mkdirp from "mkdirp";
import os from "os";
import path from "path";

dotenvExtended.load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

module.exports = async () => {
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
  const mvmContract = await new ContractFactory(
    MinimumViableMultisig.abi,
    MinimumViableMultisig.bytecode,
    wallet
  ).deploy();
  const proxyFactoryContract = await new ContractFactory(
    ProxyFactory.abi,
    ProxyFactory.bytecode,
    wallet
  ).deploy();
  const tttContract = await new ContractFactory(
    TicTacToeApp.interface,
    TicTacToeApp.bytecode,
    wallet
  ).deploy();

  mkdirp.sync(DIR);
  const addresses = {
    MinimumViableMultisigAddress: mvmContract.address,
    ProxyFactoryAddress: proxyFactoryContract.address,
    TicTacToeAddress: tttContract.address
  };
  fs.writeFileSync(path.join(DIR, "addresses"), JSON.stringify(addresses));
};
