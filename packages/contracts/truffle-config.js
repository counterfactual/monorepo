module.exports = {
  networks: {
    ganache: {
      network_id: 7777777,
      host: "127.0.0.1",
      port: 9545,
      gas: "0xfffffffffff",
      gasPrice: "0x01"
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
