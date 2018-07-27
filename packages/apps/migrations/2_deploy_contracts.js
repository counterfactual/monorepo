const StaticCall = artifacts.require("StaticCall");

module.exports = deployer => {
  deployer.deploy(StaticCall);
};
