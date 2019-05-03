const request = require('request');

require("dotenv").config();

var waffleConfig = {
  "npmPath": "../../node_modules",
  "legacyOutput": true,
  "compilerOptions": {
    "evmVersion": "constantinople"
  }
};

var selectSolc = () => {
  if (process.env.CI || process.env.NATIVE_SOLC == "true") {
    // use native solc binary for fast compilation in CI
    // TODO: native solc binary is out of sync with the latest solidity version
    // so skipping native binary usage for now
    // waffleConfig.compiler = "native";
  }

  return waffleConfig;
}

module.exports = selectSolc();
