const tdr = require("truffle-deploy-registry");

const Migrations = artifacts.require("./Migrations");

module.exports = (deployer, network) => {
  deployer.then(async () => {
    const migrations = await deployer.deploy(Migrations);

    if(!tdr.isDryRunNetworkName(network)) {
      await tdr.appendInstance(migrations);
    }
  });
};
