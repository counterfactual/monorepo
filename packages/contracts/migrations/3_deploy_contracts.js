const tdr = require("truffle-deploy-registry");

const AppRegistry = artifacts.require("AppRegistry");
const ContractRegistry = artifacts.require("ContractRegistry");
const ETHBalanceRefundApp = artifacts.require("ETHBalanceRefundApp");
const ETHBucket = artifacts.require("ETHBucket");
const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
const MultiSend = artifacts.require("MultiSend");
const NonceRegistry = artifacts.require("NonceRegistry");
const ProxyFactory = artifacts.require("ProxyFactory");
const StateChannelTransaction = artifacts.require("StateChannelTransaction");
const TwoPartyVirtualEthAsLump = artifacts.require("TwoPartyVirtualEthAsLump");
const ETHInterpreter = artifacts.require("ETHInterpreter");
const TwoPartyEthAsLump = artifacts.require("TwoPartyEthAsLump");

const ARTIFACTS = [
  AppRegistry,
  ContractRegistry,
  ETHBalanceRefundApp,
  ETHBucket,
  MinimumViableMultisig,
  MultiSend,
  NonceRegistry,
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
