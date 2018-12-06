const tdr = require("truffle-deploy-registry");

const Conditional = artifacts.require("Conditional");
const ConditionalTransaction = artifacts.require("ConditionalTransaction");
const StaticCall = artifacts.require("StaticCall");
const Transfer = artifacts.require("Transfer");
const VirtualAppAgreement = artifacts.require("VirtualAppAgreement");

module.exports = (deployer, network) => {
  deployer.then(async () => {

    const transfer = await deployer.deploy(Transfer);
    await deployer.link(Transfer, VirtualAppAgreement);
    await deployer.link(Transfer, ConditionalTransaction);

    const staticCall = await deployer.deploy(StaticCall);
    await deployer.link(StaticCall, ConditionalTransaction);
    await deployer.link(StaticCall, Conditional);

    if (!tdr.isDryRunNetworkName(network)) {
      await tdr.appendInstance(transfer);
      await tdr.appendInstance(staticCall);
    }

  });

};
