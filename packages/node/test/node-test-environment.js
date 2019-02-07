const NodeJSEnvironment = require('jest-environment-node');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_ganache_global_setup');

class NodeEnvironment extends NodeJSEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();
    let addresses = fs.readFileSync(path.join(DIR, 'addresses'), 'utf8');
    if (!addresses) {
      throw new Error('Contract addresses not found');
    }
    this.global.contractAddresses = JSON.parse(addresses);
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = NodeEnvironment;
