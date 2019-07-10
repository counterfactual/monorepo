const NodeJSEnvironment = require("jest-environment-node");

require("dotenv-extended").load();

// This environment runs for _every test suite_.

class NodeEnvironment extends NodeJSEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();

    const chain = global["chain"];

    this.global.networkContext = chain.networkContext;
    this.global.fundedPrivateKey = chain.fundedPrivateKey;
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
