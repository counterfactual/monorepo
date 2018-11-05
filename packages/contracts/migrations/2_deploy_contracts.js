const tdr = require("truffle-deploy-registry");

const Conditional = artifacts.require("Conditional");
const ConditionalTransaction = artifacts.require("ConditionalTransaction");
const MultiSend = artifacts.require("MultiSend");
const NonceRegistry = artifacts.require("NonceRegistry");
const PaymentApp = artifacts.require("PaymentApp");
const ProxyFactory = artifacts.require("ProxyFactory");
const Registry = artifacts.require("Registry");
const Signatures = artifacts.require("Signatures");
const StaticCall = artifacts.require("StaticCall");
const Transfer = artifacts.require("Transfer");
const VirtualAppAgreement = artifacts.require("VirtualAppAgreement");
const StateChannelAdjudicator = loader.require("StateChannelAdjudicator");
const ETHBalanceRefundApp = artifacts.require("ETHBalanceRefundApp");

module.exports = (deployer, network) => {
  deployer.deploy(Transfer).then(instance => {
    deployer.link(Transfer, [VirtualAppAgreement, ConditionalTransaction]);
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(StaticCall).then(instance => {
    deployer.link(StaticCall, [
      ConditionalTransaction,
      Conditional,
      StateChannelAdjudicator
    ]);
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(Signatures).then(instance => {
    deployer.link(StaticCall, [
      StateChannelAdjudicator
    ]);
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(ConditionalTransaction).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(VirtualAppAgreement).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(MultiSend).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(NonceRegistry).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(PaymentApp).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(ETHBalanceRefundApp).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(ProxyFactory).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  deployer.deploy(Registry).then(instance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(instance);
    }
  });

  // FIXME: This doesn't need to be deployed, but eth-gas-reporter breaks
  // if it isn't deployed.
  deployer.deploy(Conditional);
};
