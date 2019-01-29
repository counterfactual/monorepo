const Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, network) {
  deployer.deploy(Migrations);
};
