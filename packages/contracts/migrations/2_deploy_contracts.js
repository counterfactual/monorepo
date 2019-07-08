const tdr = require("truffle-deploy-registry");

const ChallengeRegistry = artifacts.require("ChallengeRegistry");
const CoinBalanceRefundApp = artifacts.require("CoinBalanceRefundApp");
const ETHBucket = artifacts.require("ETHBucket");
const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
const MultiSend = artifacts.require("MultiSend");
const UninstallKeyRegistry = artifacts.require("UninstallKeyRegistry");
const ProxyFactory = artifacts.require("ProxyFactory");
const ConditionalTransactionDelegateTarget = artifacts.require("ConditionalTransactionDelegateTarget");
const TwoPartyVirtualEthAsLump = artifacts.require("TwoPartyVirtualEthAsLump");
const ETHInterpreter = artifacts.require("ETHInterpreter");
const TwoPartyEthAsLump = artifacts.require("TwoPartyEthAsLump");

const ARTIFACTS = [
  ChallengeRegistry,
  CoinBalanceRefundApp,
  ETHBucket,
  MinimumViableMultisig,
  MultiSend,
  UninstallKeyRegistry,
  ProxyFactory,
  ConditionalTransactionDelegateTarget,
  TwoPartyVirtualEthAsLump,
  ETHInterpreter,
  TwoPartyEthAsLump
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
