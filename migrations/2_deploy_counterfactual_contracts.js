var GnosisSafeFactory = artifacts.require("./GnosisSafeFactory.sol");

module.exports = function(deployer) {
    deployer.deploy(GnosisSafeFactory);
};
