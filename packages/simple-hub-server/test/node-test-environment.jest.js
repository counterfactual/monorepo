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
      MultiSend: AddressZero,
      ConditionalTransactionDelegateTarget: AddressZero,
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter:
        data.networkContext.twoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      MinimumViableMultisig: data.networkContext.MinimumViableMultisig,
      ProxyFactory: data.networkContext.ProxyFactory,
      TicTacToe: data.networkContext.TicTacToe,
      MultiAssetMultiPartyCoinTransferInterpreter: data.networkContext.MultiAssetMultiPartyCoinTransferInterpreter
    };

    this.global.networkContext = networkContext;
    this.global.pgExtendedKey = data.pgExtendedKey;
    this.global.nodeAExtendedKey = data.nodeAExtendedKey;
    this.global.nodeBExtendedKey = data.nodeBExtendedKey;
    this.global.nodeCExtendedKey = data.nodeCExtendedKey;
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
