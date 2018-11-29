var tdr = require("truffle-deploy-registry");

var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, network) {

  const addToNetworkFile = (obj) =>
    tdr.isDryRunNetworkName(network) || tdr.appendInstance(obj);

  deployer.deploy(Migrations).then(addToNetworkFile);

};
