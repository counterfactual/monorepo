module.exports = {
  testCommand: 'truffle test --network coverage lib/**/*.spec.js',
  skipFiles: [
    "external/Proxy.sol",
    "external/ProxyFactory.sol",
    "lib/StaticCall.sol",
    "delegateTargets/MultiSend.sol",
    "Registry.sol",
    "test/loadContracts.sol"
  ]
};
