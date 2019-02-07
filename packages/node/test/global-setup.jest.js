require('dotenv-extended').load();

const MinimumViableMultisig = require("@counterfactual/contracts/build/MinimumViableMultisig.json");
const ProxyFactory = require("@counterfactual/contracts/build/ProxyFactory.json");
const TicTacToeApp = require("@counterfactual/apps/build/TicTacToeApp.json");

const ethers = require("ethers");
const ganache = require("ganache-core");
const fs = require("fs");
const mkdirp = require('mkdirp');
const os = require("os");
const path = require("path");

const DIR = path.join(os.tmpdir(), 'jest_ganache_global_setup');

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
  global.ganacheServer = server;
  server.listen(parseInt(process.env.GANACHE_PORT));
  const provider = new ethers.providers.Web3Provider(server.provider);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_A, provider);
  const mvmContract = await new ethers.ContractFactory(
    MinimumViableMultisig.abi,
    MinimumViableMultisig.bytecode,
    wallet
  ).deploy();
  const proxyFactoryContract = await new ethers.ContractFactory(
    ProxyFactory.abi,
    ProxyFactory.bytecode,
    wallet
  ).deploy();
  const tttContract = await new ethers.ContractFactory(
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
}
