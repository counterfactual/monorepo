const pkg = require("../../package.json");

module.exports = {
  networks: {
    ganache: {
      network_id: pkg.config.ganacheNetworkID,
      host: "127.0.0.1",
      port: pkg.config.ganachePort,
      gas: pkg.config.ganacheGasLimit,
      gasPrice: pkg.config.ganaceGasPrice
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
