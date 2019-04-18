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
      AppRegistry: AddressZero,
      ETHBalanceRefundApp: AddressZero,
      ETHBucket: AddressZero,
      MultiSend: AddressZero,
      NonceRegistry: AddressZero,
      StateChannelTransaction: AddressZero,
      ETHVirtualAppAgreement: AddressZero,
      MinimumViableMultisig: data.networkContext.MinimumViableMultisig,
      ProxyFactory: data.networkContext.ProxyFactory,
      TicTacToe: data.networkContext.TicTacToe
    };

    this.global.networkContext = networkContext;
    this.global.playgroundMnemonic = data.playgroundMnemonic;
    this.global.aliceMnemonic = data.aliceMnemonic;
    this.global.botMnemonic = data.botMnemonic;
    this.global.aliceAddress = data.aliceAddress;
    this.global.botAddress = data.botAddress;
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
