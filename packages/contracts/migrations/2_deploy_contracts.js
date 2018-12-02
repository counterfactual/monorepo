const tdr = require("truffle-deploy-registry");

// Library
const Transfer = artifacts.require("Transfer");
const LibStaticCall = artifacts.require("LibStaticCall");

// Delegate Targets
const ConditionalTransaction = artifacts.require("ConditionalTransaction");
const StateChannelTransaction = artifacts.require("StateChannelTransaction");

// Core Registries
const ContractRegistry = artifacts.require("ContractRegistry");
const NonceRegistry = artifacts.require("NonceRegistry");
const AppRegistry = artifacts.require("AppRegistry");

// Generic
const MultiSend = artifacts.require("MultiSend");

module.exports = (deployer, network) => {
  const addToNetworkFile = obj =>
    tdr.isDryRunNetworkName(network) || tdr.appendInstance(obj);

  deployer
    .deploy(Transfer)
    .then(addToNetworkFile)
    .then(() => {
      deployer.link(Transfer, [
        StateChannelTransaction,
        ConditionalTransaction,
        AppRegistry
      ]);
    });

  deployer
    .deploy(LibStaticCall)
    .then(addToNetworkFile)
    .then(() => {
      deployer.link(LibStaticCall, [
        StateChannelTransaction,
        ConditionalTransaction,
        AppRegistry
      ]);
    });

  deployer.deploy(StateChannelTransaction).then(addToNetworkFile);

  deployer.deploy(ConditionalTransaction).then(addToNetworkFile);

  deployer.deploy(MultiSend).then(addToNetworkFile);

  deployer.deploy(NonceRegistry).then(addToNetworkFile);

  deployer.deploy(ContractRegistry).then(addToNetworkFile);

  deployer.deploy(AppRegistry).then(addToNetworkFile);
};
