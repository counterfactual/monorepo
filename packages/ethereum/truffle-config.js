module.exports = {
	networks: {
		ganache: {
			network_id: "*", // eslint-disable-line camelcase
			host: "127.0.0.1",
			port: 8545,
			gas: 6.9e6
		},
		coverage: {
			host: "localhost",
			network_id: "*", // eslint-disable-line camelcase
			port: 8555,
			gas: 0xffffffffff,
			gasPrice: 0x01
		}
	},
	solc: {
		optimizer: {
			enabled: true,
			runs: 200
		}
	}
};
