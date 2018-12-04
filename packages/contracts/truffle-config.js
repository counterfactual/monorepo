const HDWalletProvider = require("truffle-hdwallet-provider");

require("dotenv").config();

module.exports = {
  networks: {
    ganache: {
      network_id: 7777777,
      host: "127.0.0.1",
      port: 9545,
      gas: "0xfffffffffff",
      gasPrice: "0x01"
    },
    rinkeby: {
      network_id: 4,
      provider: () =>
        new HDWalletProvider(
          process.env.ETH_ACCOUNT_MNENOMIC,
          `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      gas: process.env.DEFAULT_GAS,
      gasPrice: process.env.DEFAULT_GAS_PRICE
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    reporter: "eth-gas-reporter",
    reporterOptions: {
      currency: "USD",
      gasPrice: 21,
      outputFile: "/dev/null",
      showTimeSpent: true
    }
  }
};
