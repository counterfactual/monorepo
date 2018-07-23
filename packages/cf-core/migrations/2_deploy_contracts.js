const Registry = artifacts.require("Registry");
const NonceRegistry = artifacts.require("NonceRegistry");
const ConditionalTransfer = artifacts.require("ConditionalTransfer");
const VCAgreement = artifacts.require("VCAgreement");
const MultiSend = artifacts.require("MultiSend");
const StaticCall = artifacts.require("StaticCall");
const Signatures = artifacts.require("Signatures");
const Conditional = artifacts.require("Conditional");
const Transfer = artifacts.require("Transfer");

module.exports = deployer => {
  deployer.deploy(StaticCall).then(() => {
    deployer.link(StaticCall, [ConditionalTransfer, Conditional]);
  });

  deployer.deploy(Transfer).then(() => {
    return deployer.link(Transfer, [VCAgreement, ConditionalTransfer]);
  });

  deployer.deploy(Signatures);
  deployer.deploy(NonceRegistry);
  deployer.deploy(MultiSend);

  deployer.deploy(Registry).then(() => {
    return deployer.deploy(ConditionalTransfer, Registry.address);
  });

};
