const HDWalletProvider = require("truffle-hdwallet-provider");

require("dotenv-safe").config();

module.exports = {
  contracts_build_directory: "./build",
  contracts_directory: "../contracts",
  migrations_directory: "../contracts/migrations",
  networks: {
    machine: {
      network_id: process.env.DEV_GANACHE_NETWORK_ID,
      provider: function() {
        return new HDWalletProvider(
          process.env.DEV_GANACHE_MNEMONIC,
          `http://${process.env.DEV_GANACHE_HOST}:${process.env.DEV_GANACHE_PORT}/`
        );
      }
    }
  },
  compilers: {
    solc: {
      version: "../../node_modules/solc"
    }
  }
};
