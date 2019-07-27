const tdr = require("truffle-deploy-registry");

const ARTIFACTS = [
  artifacts.require("ChallengeRegistry"),
  artifacts.require("CoinBalanceRefundApp"),
  artifacts.require("SingleAssetTwoPartyCoinTransferFromVirtualAppInterpreter"),
  artifacts.require("MultiAssetMultiPartyCoinTransferInterpreter"),
  artifacts.require("ConditionalTransactionDelegateTarget"),
  artifacts.require("IdentityApp"),
  artifacts.require("MinimumViableMultisig"),
  artifacts.require("ProxyFactory"),
  artifacts.require("SingleAssetTwoPartyCoinTransferInterpreter"),
  artifacts.require("TimeLockedPassThrough"),
  artifacts.require("TwoPartyFixedOutcomeInterpreter"),
  artifacts.require("TwoPartyFixedOutcomeFromVirtualAppInterpreter")
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
