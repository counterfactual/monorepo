const tdr = require("truffle-deploy-registry");

const CommitReveal = artifacts.require("CommitRevealApp");
const CountingApp = artifacts.require("CountingApp");
const HighRollerApp = artifacts.require("HighRollerApp");
const NimApp = artifacts.require("NimApp");
const PaymentApp = artifacts.require("PaymentApp");
const TicTacToeApp = artifacts.require("TicTacToeApp");

const ARTIFACTS = [
  CommitReveal,
  CountingApp,
  HighRollerApp,
  NimApp,
  PaymentApp,
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
