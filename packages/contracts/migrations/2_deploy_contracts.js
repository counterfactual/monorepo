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
const ETHBalanceRefundApp = artifacts.require("ETHBalanceRefundApp");

module.exports = (deployer, network) => {
  deployer.then(async () => {

    const artifacts = [
      {
        'artifact': Transfer,
        'dependents': [VirtualAppAgreement, ConditionalTransaction]
      },
      {
        'artifact': StaticCall,
        'dependents': [ConditionalTransaction, Conditional]
      },
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

    for (const entry of artifacts) {
      const artifact = entry.artifact || entry;
      const instance = await deployer.deploy(artifact);

      // link each dependent contract individually
      // https://github.com/trufflesuite/truffle/pull/1489
      for (const dependent of entry.dependents || []) {
        await deployer.link(artifact, dependent);
      }
      if (!tdr.isDryRunNetworkName(network)) {
        await tdr.appendInstance(instance);
      }
    }

  });

};
