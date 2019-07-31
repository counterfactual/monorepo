module.exports = {
  testCommand: 'truffle test --network coverage lib/*.spec.js',
  skipFiles: [
    "proxies/Proxy.sol",
    "proxies/ProxyFactory.sol"
  ]
};
