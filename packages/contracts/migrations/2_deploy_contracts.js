const tdr = require("truffle-deploy-registry");

const ARTIFACTS = [
  // artifacts.require("ChallengeRegistry"),
  artifacts.require("ConditionalTransactionDelegateTarget"),
  artifacts.require("CoinBalanceRefundApp"),
  artifacts.require("CoinTransferETHInterpreter"),
  // artifacts.require("FreeBalanceApp"),
  // artifacts.require("IdentityApp"),
  // artifacts.require("MinimumViableMultisig"),
  // artifacts.require("ProxyFactory"),
  // artifacts.require("TwoPartyFixedOutcomeETHInterpreter"),
  // artifacts.require("TwoPartyFixedOutcomeFromVirtualAppETHInterpreter")
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
