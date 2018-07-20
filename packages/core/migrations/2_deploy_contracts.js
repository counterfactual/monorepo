const Registry = artifacts.require("./Registry.sol");
const NonceRegistry = artifacts.require("./NonceRegistry.sol");
const ConditionalTransfer = artifacts.require("./ConditionalTransfer.sol");
const VCAgreement = artifacts.require("./VCAgreement.sol");
const MultiSend = artifacts.require("./MultiSend.sol");

const StaticCall = artifacts.require("./StaticCall.sol");
const Signatures = artifacts.require("./Signatures.sol");
const Condition = artifacts.require("./Condition.sol");
const Transfer = artifacts.require("./Transfer.sol");
// const Rules = artifacts.require("./Rules.sol");
const Disputable = artifacts.require("./Disputable.sol");

module.exports = deployer => {
  deployer.deploy(StaticCall).then(() => {
    deployer.link(StaticCall, [ConditionalTransfer, Condition]);
    // deployer.deploy(Rules);
    // return deployer.deploy(Condition).then(() => {
    //   return deployer.link(Condition, [VCAgreement, ConditionalTransfer]);
    // });
  });

  deployer.deploy(Transfer).then(() => {
    return deployer.link(Transfer, [VCAgreement, ConditionalTransfer]);
  });

  deployer.deploy(Disputable).then(() => {
    return deployer.link(Disputable, [NonceRegistry]);
  });

  deployer.deploy(Signatures);
  deployer.deploy(NonceRegistry);
  deployer.deploy(MultiSend);
  deployer.deploy(Disputable);

  deployer.deploy(Registry).then(() => {
    return deployer.deploy(ConditionalTransfer, Registry.address);
  });

};
