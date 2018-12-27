module.exports = {
  testCommand: 'truffle test --network coverage lib/*.spec.js',
  skipFiles: [
    "proxies/Proxy.sol",
    "proxies/ProxyFactory.sol",
    "libs/LibStaticCall.sol",
    "MultiSend.sol",
    "ContractRegistry.sol"
  ]
};
