import TicTacToeApp from "@counterfactual/apps/expected-build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/cf-adjudicator-contracts/expected-build/ChallengeRegistry.json";
import CoinBalanceRefundApp from "@counterfactual/cf-funding-protocol-contracts/expected-build/CoinBalanceRefundApp.json";
import ConditionalTransactionDelegateTarget from "@counterfactual/cf-funding-protocol-contracts/expected-build/ConditionalTransactionDelegateTarget.json";
import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/expected-build/DolphinCoin.json";
import IdentityApp from "@counterfactual/cf-funding-protocol-contracts/expected-build/IdentityApp.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build/MinimumViableMultisig.json";
import MultiAssetMultiPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build/MultiAssetMultiPartyCoinTransferInterpreter.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build/ProxyFactory.json";
import SingleAssetTwoPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build/SingleAssetTwoPartyCoinTransferInterpreter.json";
import TimeLockedPassThrough from "@counterfactual/cf-funding-protocol-contracts/expected-build/TimeLockedPassThrough.json";
import TwoPartyFixedOutcomeFromVirtualAppInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build/TwoPartyFixedOutcomeFromVirtualAppInterpreter.json";
import TwoPartyFixedOutcomeInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build/TwoPartyFixedOutcomeInterpreter.json";
import { NetworkContext } from "@counterfactual/types";
import { ContractFactory, Wallet } from "ethers";

export type NetworkContextForTestSuite = NetworkContext & {
  TicTacToeApp: string;
  DolphinCoin: string;
};

export async function deployTestArtifactsToChain(wallet: Wallet) {
  const coinBalanceRefundContract = await new ContractFactory(
    CoinBalanceRefundApp.abi,
    CoinBalanceRefundApp.evm.bytecode,
    wallet
  ).deploy();

  const dolphinCoin = await new ContractFactory(
    DolphinCoin.abi,
    DolphinCoin.evm.bytecode,
    wallet
  ).deploy();

  const identityApp = await new ContractFactory(
    IdentityApp.abi,
    IdentityApp.evm.bytecode,
    wallet
  ).deploy();

  const mvmContract = await new ContractFactory(
    MinimumViableMultisig.abi,
    MinimumViableMultisig.evm.bytecode,
    wallet
  ).deploy();

  const proxyFactoryContract = await new ContractFactory(
    ProxyFactory.abi,
    ProxyFactory.evm.bytecode,
    wallet
  ).deploy();

  const coinTransferETHInterpreter = await new ContractFactory(
    MultiAssetMultiPartyCoinTransferInterpreter.abi,
    MultiAssetMultiPartyCoinTransferInterpreter.evm.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeInterpreter.abi,
    TwoPartyFixedOutcomeInterpreter.evm.bytecode,
    wallet
  ).deploy();

  const challengeRegistry = await new ContractFactory(
    ChallengeRegistry.abi,
    ChallengeRegistry.evm.bytecode,
    wallet
  ).deploy();

  const conditionalTransactionDelegateTarget = await new ContractFactory(
    ConditionalTransactionDelegateTarget.abi,
    ConditionalTransactionDelegateTarget.evm.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeFromVirtualAppETHInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.abi,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.evm.bytecode,
    wallet
  ).deploy();

  const tttContract = await new ContractFactory(
    TicTacToeApp.abi,
    TicTacToeApp.evm.bytecode,
    wallet
  ).deploy();

  const timeLockedPassThrough = await new ContractFactory(
    TimeLockedPassThrough.abi,
    TimeLockedPassThrough.evm.bytecode,
    wallet
  ).deploy();

  const singleAssetTwoPartyCoinTransferInterpreter = await new ContractFactory(
    SingleAssetTwoPartyCoinTransferInterpreter.abi,
    SingleAssetTwoPartyCoinTransferInterpreter.evm.bytecode,
    wallet
  ).deploy();

  return {
    ChallengeRegistry: challengeRegistry.address,
    ConditionalTransactionDelegateTarget:
      conditionalTransactionDelegateTarget.address,
    IdentityApp: identityApp.address,
    MultiAssetMultiPartyCoinTransferInterpreter:
      coinTransferETHInterpreter.address,
    CoinBalanceRefundApp: coinBalanceRefundContract.address,
    DolphinCoin: dolphinCoin.address,
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    SingleAssetTwoPartyCoinTransferInterpreter:
      singleAssetTwoPartyCoinTransferInterpreter.address,
    TicTacToeApp: tttContract.address,
    TimeLockedPassThrough: timeLockedPassThrough.address,
    TwoPartyFixedOutcomeInterpreter: twoPartyFixedOutcomeInterpreter.address,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter:
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter.address
  } as NetworkContextForTestSuite;
}
