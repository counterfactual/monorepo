const { readFileSync } = require("fs");
const NodeJSEnvironment = require("jest-environment-node");
const os = require("os");
const path = require("path");

const DIR = path.join(os.tmpdir(), "jest_ganache_global_setup");

class NodeEnvironment extends NodeJSEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();
    const networkContext = readFileSync(path.join(DIR, "networkContext"), "utf8");
    if (!networkContext) {
      throw new Error("Network context not found");
    }
    this.global.networkContext = JSON.parse(networkContext);
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = NodeEnvironment;
