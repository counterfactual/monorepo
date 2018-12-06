const tdr = require("truffle-deploy-registry");

const StateChannelTransaction = artifacts.require("StateChannelTransaction");
const LibStaticCall = artifacts.require("LibStaticCall");
const Transfer = artifacts.require("Transfer");
const AppRegistry = artifacts.require("AppRegistry");

module.exports = (deployer, network) => {
  deployer.then(async () => {

    const transfer = await deployer.deploy(Transfer);
    await deployer.link(Transfer, [
      StateChannelTransaction,
      AppRegistry
    ]);

    const staticCall = await deployer.deploy(LibStaticCall);
    await deployer.link(LibStaticCall, [
      StateChannelTransaction,
      AppRegistry
    ]);

    if (!tdr.isDryRunNetworkName(network)) {
      await tdr.appendInstance(transfer);
      await tdr.appendInstance(staticCall);
    }

  });

};
