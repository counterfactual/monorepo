const tdr = require("truffle-deploy-registry");

const Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, network) {
  deployer.deploy(Migrations).then(migrationsInstance => {
    if (!tdr.isDryRunNetworkName(network)) {
      return tdr.appendInstance(migrationsInstance);
    }
  });
};
