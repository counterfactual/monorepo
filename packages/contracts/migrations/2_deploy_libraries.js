const tdr = require("truffle-deploy-registry");

const StateChannelTransaction = artifacts.require("StateChannelTransaction");
const LibStaticCall = artifacts.require("LibStaticCall");
const Transfer = artifacts.require("Transfer");
const AppRegistry = artifacts.require("AppRegistry");
const VirtualAppAgreement = artifacts.require("ETHVirtualAppAgreement");

/// Deploy the libraries Transfer and StaticCall and link their dependents
/// against them.
/// todo(xuanji): due to an upstream bug in truffle
/// (https://github.com/trufflesuite/truffle/pull/1489) multi-target links
/// should not be used, otherwise a hard-to-track-down bug will appear; we can
/// switch back when our version of truffle contains #1489
module.exports = (deployer, network) => {
  deployer.then(async () => {

    const transfer = await deployer.deploy(Transfer);
    await deployer.link(Transfer, StateChannelTransaction);
    await deployer.link(Transfer, AppRegistry);
    await deployer.link(Transfer, VirtualAppAgreement);

    const staticCall = await deployer.deploy(LibStaticCall);
    await deployer.link(LibStaticCall, AppRegistry);
    await deployer.link(LibStaticCall, VirtualAppAgreement);
    await deployer.link(LibStaticCall, StateChannelTransaction);

    if (!tdr.isDryRunNetworkName(network)) {
      await tdr.appendInstance(transfer);
      await tdr.appendInstance(staticCall);
    }

  });

};
