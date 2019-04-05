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

  } else {
    const solcjsVersion =
    'v'+/([0-9a-z\.\+]+)\.Emscripten\.clang/g.exec(require("solc").version()).splice(1)[0];
    waffleConfig.solcVersion = solcjsVersion;
  }
  console.log(waffleConfig);
  return waffleConfig;
}

module.exports = selectSolc();
