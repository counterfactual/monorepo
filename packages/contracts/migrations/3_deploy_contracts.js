const tdr = require("truffle-deploy-registry");

const Conditional = artifacts.require("Conditional");
const ConditionalTransaction = artifacts.require("ConditionalTransaction");
const MultiSend = artifacts.require("MultiSend");
const NonceRegistry = artifacts.require("NonceRegistry");
const PaymentApp = artifacts.require("PaymentApp");
const ProxyFactory = artifacts.require("ProxyFactory");
const Registry = artifacts.require("Registry");
const Signatures = artifacts.require("Signatures");
const VirtualAppAgreement = artifacts.require("ETHVirtualAppAgreement");
const ETHBalanceRefundApp = artifacts.require("ETHBalanceRefundApp");

const ARTIFACTS = [
  ConditionalTransaction,
  VirtualAppAgreement,
  MultiSend,
  NonceRegistry,
  PaymentApp,
  ETHBalanceRefundApp,
  ProxyFactory,
  Registry,
  Signatures,
  // FIXME: This doesn't need to be deployed, but eth-gas-reporter breaks
  // if it isn't deployed.
  Conditional
];

module.exports = (deployer, network) => {
  deployer.then(async () => {

    for (const artifact of ARTIFACTS) {
      const instance = await deployer.deploy(artifact);

      if (!tdr.isDryRunNetworkName(network)) {
        await tdr.appendInstance(instance);
      }
    }

  });

};
