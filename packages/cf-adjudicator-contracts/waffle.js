const request = require('request');

require("dotenv").config();

var waffleConfig = {
  "npmPath": "../../node_modules",
  "legacyOutput": true,
  "compilerOptions": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "evmVersion": "petersburg",
    "metadata": {
      "useLiteralContent": true
    },
    "outputSelection": {
      "*": {
        "*": [
          "metadata", "evm.bytecode", "evm.bytecode.sourceMap", "abi"
        ],
      },
    }
  }
};

var selectSolc = () => {
  // TODO: which should select "native" in CI, but the solc binary in the CI
  // environment is currently too old
  if (process.env.NATIVE_SOLC == "true") {
    waffleConfig.compiler = "native";
  }

  return waffleConfig;
}

module.exports = selectSolc();
