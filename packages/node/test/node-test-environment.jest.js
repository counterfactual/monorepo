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
    let addresses = readFileSync(path.join(DIR, "addresses"), "utf8");
    if (!addresses) {
      throw new Error("Contract addresses not found");
    }
    addresses = JSON.parse(addresses);

    const networkContext = {
      AppRegistry: AddressZero,
      ETHBalanceRefund: addresses.ETHBalanceRefundApp,
      ETHBucket: AddressZero,
      MultiSend: AddressZero,
      NonceRegistry: AddressZero,
      StateChannelTransaction: AddressZero,
      ETHVirtualAppAgreement: AddressZero,
      MinimumViableMultisig: addresses.MinimumViableMultisig,
      ProxyFactory: addresses.ProxyFactory,
      TicTacToe: addresses.TicTacToe
    };

    this.global.networkContext = networkContext;
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
