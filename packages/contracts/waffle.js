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
    waffleConfig.compiler = "native";
  }

  return waffleConfig;
}

module.exports = selectSolc();
