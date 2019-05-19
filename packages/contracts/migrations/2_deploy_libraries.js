const tdr = require("truffle-deploy-registry");

const StateChannelTransaction = artifacts.require("StateChannelTransaction");
const LibStaticCall = artifacts.require("LibStaticCall");
const AppRegistry = artifacts.require("AppRegistry");
const TwoPartyVirtualEthAsLump = artifacts.require("TwoPartyVirtualEthAsLump");

/// Deploy the libraries Transfer and StaticCall and link their dependents
/// against them.
/// todo(xuanji): due to an upstream bug in truffle
/// (https://github.com/trufflesuite/truffle/pull/1489) multi-target links
/// should not be used, otherwise a hard-to-track-down bug will appear; we can
/// switch back when our version of truffle contains #1489
module.exports = (deployer, network) => {
  deployer.then(async () => {

    const staticCall = await deployer.deploy(LibStaticCall);
    await deployer.link(LibStaticCall, AppRegistry);
    await deployer.link(LibStaticCall, TwoPartyVirtualEthAsLump);
    await deployer.link(LibStaticCall, StateChannelTransaction);

    if (!tdr.isDryRunNetworkName(network)) {
      await tdr.appendInstance(staticCall);
    }

  });

};
