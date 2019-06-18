const tdr = require("truffle-deploy-registry");

const ChallengeRegistry = artifacts.require("ChallengeRegistry");
const ETHBalanceRefundApp = artifacts.require("ETHBalanceRefundApp");
const ETHBucket = artifacts.require("ETHBucket");
const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
const MultiSend = artifacts.require("MultiSend");
const RootNonceRegistry = artifacts.require("RootNonceRegistry");
const UninstallKeyRegistry = artifacts.require("UninstallKeyRegistry");
const ProxyFactory = artifacts.require("ProxyFactory");
const StateChannelTransaction = artifacts.require("StateChannelTransaction");
const TwoPartyVirtualEthAsLump = artifacts.require("TwoPartyVirtualEthAsLump");
const ETHInterpreter = artifacts.require("ETHInterpreter");
const TwoPartyEthAsLump = artifacts.require("TwoPartyEthAsLump");

const ARTIFACTS = [
  ChallengeRegistry,
  ETHBalanceRefundApp,
  ETHBucket,
  MinimumViableMultisig,
  MultiSend,
  RootNonceRegistry,
  UninstallKeyRegistry,
  ProxyFactory,
  StateChannelTransaction,
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
