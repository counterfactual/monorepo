module.exports = {
    skipFiles: [
		'lib',
		'mocks/MockRegistry.sol',
		//https://github.com/sc-forks/solidity-coverage/issues/176
		'common/Proxy.sol',
		'factory/ProxyFactory.sol',
	]
};
