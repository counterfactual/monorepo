const config = {
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*",
        },
        testing: {
            host: "localhost",
            port: 8545,
            network_id: "*",
            gas: 2e7,
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,
            gas: 0xfffffffffff,
            gasPrice: 0x01,
        },
        mainnet: {
            host: "localhost",
            port: 8545,
            network_id: "1",
        },
        ropsten: {
            host: "localhost",
            port: 8545,
            network_id: "3",
        },
        kovan: {
            host: "localhost",
            port: 8545,
            network_id: "42",
        },
        rinkeby: {
            host: "localhost",
            port: 8545,
            network_id: "4",
        },
    },
}

module.exports = config
