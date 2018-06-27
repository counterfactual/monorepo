module.exports = {
	testCommand: 'truffle test --network coverage lib/**/*.spec.js',
	skipFiles: [
		"lib/Proxy.sol",
		"lib/ProxyFactory.sol",
		"multisig/MultiSend.sol",
		"registry/Registry.sol"
	]
};
