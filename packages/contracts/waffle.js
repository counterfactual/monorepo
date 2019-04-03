const fs = require('fs');
const request = require('request');
const solcjs = require('solc');

require("dotenv").config();

var waffleConfig = {
  "npmPath": "../../node_modules",
  "legacyOutput": true,
  "compilerOptions": {
    "evmVersion": "constantinople"
  }
};

var getLongVersion = (shortVersion) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://ethereum.github.io/solc-bin/bin/list.json',
      json: true
    }, (err, res, body) => {
      if (!err && res.statusCode == 200) {
        var path = body.releases[shortVersion];
        // path of form soljson-v0.5.7+commit.6da8b019.js
        var longVersion =
        /soljson\-([0-9a-z\.\+]+)\.js/g.exec(path).splice(1)[0];
        resolve(longVersion);
      }
    }).on('error', (err) => {
      console.error(err);
      reject(err);
    });
  });
};

var selectSolc = async (cb) => {
  if (process.env.CI || process.env.NATIVE_SOLC) {
    // use native solc binary for fast compilation in CI
    waffleConfig.compiler = "native";

  } else {

    const solcjsVersion =
    'v'+/([0-9a-z\.\+]+)\.Emscripten\.clang/g.exec(require("solc").version()).splice(1)[0] ;

    const MigrationsContract = fs.readFileSync("contracts/Migrations.sol", "utf-8");
    let compiledContract = await solcjs.compile(JSON.stringify({
      language: "Solidity",
      sources: {
        "Migrations.sol": {
          "content": MigrationsContract
        }
      },
      settings: {
        outputSelection: {
          "*": {
            "*": [ "*" ]
          }
        }
      }
    }));

    if (JSON.parse(compiledContract).errors) {
      var msg = JSON.parse(compiledContract).errors[0].formattedMessage
      var solcjsExpected = /pragma\ssolidity\s([0-9\.]+)/g.exec(msg).splice(1)[0];
      // solcjsExpected of form: 0.5.4
      getLongVersion(solcjsExpected).then((version) => {
        waffleConfig.solcVersion = version;
      });

    } else {
      // using the latest solcjs if the version matches
      waffleConfig.solcVersion = solcjsVersion;
    }
  }
  cb(waffleConfig);
}

module.exports = new Promise((resolve, reject) => {
  selectSolc((config) => {
    console.log(config);
    resolve(config);
  });
});


