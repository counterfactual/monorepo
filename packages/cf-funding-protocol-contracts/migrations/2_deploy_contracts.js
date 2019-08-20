const tdr = require("truffle-deploy-registry");

// TODO: Handle this deployment manually
// artifacts.require("ProxyFactory")
// Do not add to ARTIFACTS

const ARTIFACTS = [
  artifacts.require("ChallengeRegistry"),
  artifacts.require("CoinBalanceRefundApp"),
  artifacts.require("ConditionalTransactionDelegateTarget"),
  artifacts.require("IdentityApp"),
  artifacts.require("MinimumViableMultisig"),
  artifacts.require("MultiAssetMultiPartyCoinTransferInterpreter"),
  artifacts.require("SingleAssetTwoPartyCoinTransferFromVirtualAppInterpreter"),
  artifacts.require("SingleAssetTwoPartyCoinTransferInterpreter"),
  artifacts.require("TimeLockedPassThrough"),
  artifacts.require("TwoPartyFixedOutcomeFromVirtualAppInterpreter"),
  artifacts.require("TwoPartyFixedOutcomeInterpreter"),
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
