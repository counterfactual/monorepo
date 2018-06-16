module.exports = {
    skipFiles: [
		'lib',
		//https://github.com/sc-forks/solidity-coverage/issues/176
		'common/Proxy.sol',
		'multisig/MultiSend.sol',
		'factory/ProxyFactory.sol',
		'registry/Registry.sol'
	]
};
