const tdr = require("truffle-deploy-registry");

const ARTIFACTS = [
  artifacts.require("HighRollerApp"),
  artifacts.require("NimApp"),
  artifacts.require("TicTacToeApp"),
  artifacts.require("UnidirectionalTransferApp"),
  artifacts.require("SimpleTwoPartySwapApp")
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
