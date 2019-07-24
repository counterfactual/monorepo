const tdr = require("truffle-deploy-registry");

const ARTIFACTS = [
  artifacts.require("ChallengeRegistry"),
  artifacts.require("CoinBalanceRefundApp"),
  artifacts.require("CoinTransferInterpreter"),
  artifacts.require("ConditionalTransactionDelegateTarget"),
  artifacts.require("FreeBalanceApp"),
  artifacts.require("IdentityApp"),
  artifacts.require("MinimumViableMultisig"),
  artifacts.require("ProxyFactory"),
  artifacts.require("TimeLockedPassThrough"),
  artifacts.require("TwoPartyFixedOutcomeInterpreter"),
  artifacts.require("TwoPartyFixedOutcomeFromVirtualAppETHInterpreter")
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
