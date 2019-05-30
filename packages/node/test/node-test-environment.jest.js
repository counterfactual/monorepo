const { AddressZero } = require("ethers/constants");
const { readFileSync } = require("fs");
const NodeJSEnvironment = require("jest-environment-node");
const os = require("os");
const path = require("path");

require("dotenv-extended").load();

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

// This environment runs for _every test suite_.

class NodeEnvironment extends NodeJSEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();
    let accounts = readFileSync(path.join(DIR, "accounts"), "utf8");
    if (!accounts) {
      throw new Error("Accounts information not found");
    }
    accounts = JSON.parse(accounts);

    const networkContext = {
      ChallengeRegistry: accounts.contractAddresses.ChallengeRegistry,
      ETHBalanceRefundApp: accounts.contractAddresses.ETHBalanceRefundApp,
      ETHBucket: accounts.contractAddresses.ETHBucket,
      MultiSend: accounts.contractAddresses.MultiSend,
      RootNonceRegistry: accounts.contractAddresses.RootNonceRegistry,
      UninstallKeyRegistry: accounts.contractAddresses.UninstallKeyRegistry,
      StateChannelTransaction: accounts.contractAddresses.StateChannelTransaction,
      TwoPartyVirtualEthAsLump: accounts.contractAddresses.TwoPartyVirtualEthAsLump,
      MinimumViableMultisig: accounts.contractAddresses.MinimumViableMultisig,
      ProxyFactory: accounts.contractAddresses.ProxyFactory,
      TicTacToe: accounts.contractAddresses.TicTacToe,
      ETHInterpreter: accounts.contractAddresses.ETHInterpreter,
      TwoPartyEthAsLump: accounts.contractAddresses.TwoPartyEthAsLump
    };

    this.global.networkContext = networkContext;
    this.global.fundedPrivateKey = accounts.fundedPrivateKey;
    this.global.ganacheURL = `http://localhost:${process.env.GANACHE_PORT}`;
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = NodeEnvironment;
