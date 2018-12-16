const tdr = require("truffle-deploy-registry");

const Conditional = artifacts.require("Conditional");
const ConditionalTransaction = artifacts.require("ConditionalTransaction");
const StaticCall = artifacts.require("StaticCall");
const Transfer = artifacts.require("Transfer");
const VirtualAppAgreement = artifacts.require("VirtualAppAgreement");

/// Deploy the libraries Transfer and StaticCall and link their dependents
/// against them.
/// todo(ldct): due to an upstream bug in truffle
/// (https://github.com/trufflesuite/truffle/pull/1489) multi-target links
/// should not be used, otherwise a hard-to-track-down bug will appear; we can
/// switch back when our version of truffle contains #1489
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
