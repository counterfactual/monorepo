const tdr = require("truffle-deploy-registry");

const CommitReveal = artifacts.require("CommitRevealApp");
const HighRollerApp = artifacts.require("HighRollerApp");
const NimApp = artifacts.require("NimApp");
const TicTacToeApp = artifacts.require("TicTacToeApp");

const ARTIFACTS = [
  CommitReveal,
  HighRollerApp,
  NimApp,
  TicTacToeApp
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
