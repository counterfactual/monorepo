const tdr = require("truffle-deploy-registry");

const HighRollerApp = artifacts.require("HighRollerApp");
const NimApp = artifacts.require("NimApp");
const TicTacToeApp = artifacts.require("TicTacToeApp");
const ETHUnidirectionalTransferApp = artifacts.require("ETHUnidirectionalTransferApp");

const ARTIFACTS = [
  HighRollerApp,
  NimApp,
  TicTacToeApp,
  ETHUnidirectionalTransferApp
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
