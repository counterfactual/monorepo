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
    let data = readFileSync(path.join(DIR, "data"), "utf8");
    if (!data) {
      throw new Error("Global setup state not found");
    }
    data = JSON.parse(data);

    const networkContext = {
      ChallengeRegistry: AddressZero,
      CoinBalanceRefundApp: AddressZero,
      ETHBucket: AddressZero,
      MultiSend: AddressZero,
      UninstallKeyRegistry: AddressZero,
      ConditionalTransactionDelegateTarget: AddressZero,
      TwoPartyVirtualEthAsLump: AddressZero,
      MinimumViableMultisig: data.networkContext.MinimumViableMultisig,
      ProxyFactory: data.networkContext.ProxyFactory,
      TicTacToe: data.networkContext.TicTacToe,
      ETHInterpreter: data.networkContext.ETHInterpreter
    };

    this.global.networkContext = networkContext;
    this.global.pgMnemonic = data.pgMnemonic;
    this.global.nodeAMnemonic = data.nodeAMnemonic;
    this.global.nodeBMnemonic = data.nodeBMnemonic;
    this.global.nodeCMnemonic = data.nodeCMnemonic;
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
