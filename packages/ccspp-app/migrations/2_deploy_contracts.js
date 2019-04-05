const tdr = require("truffle-deploy-registry");

const ChannelizedCoinShufflePlusApp =
  artifacts.require("ChannelizedCoinShufflePlusApp");

const ARTIFACTS = [
  ChannelizedCoinShufflePlusApp
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
