import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/cf-adjudicator-contracts/build/ChallengeRegistry.json";
import CoinBalanceRefundApp from "@counterfactual/cf-funding-protocol-contracts/build/CoinBalanceRefundApp.json";
import ConditionalTransactionDelegateTarget from "@counterfactual/cf-funding-protocol-contracts/build/ConditionalTransactionDelegateTarget.json";
import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/build/DolphinCoin.json";
import IdentityApp from "@counterfactual/cf-funding-protocol-contracts/build/IdentityApp.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/build/MinimumViableMultisig.json";
import MultiAssetMultiPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/build/MultiAssetMultiPartyCoinTransferInterpreter.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/build/ProxyFactory.json";
import SingleAssetTwoPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/build/SingleAssetTwoPartyCoinTransferInterpreter.json";
import TimeLockedPassThrough from "@counterfactual/cf-funding-protocol-contracts/build/TimeLockedPassThrough.json";
import TwoPartyFixedOutcomeFromVirtualAppInterpreter from "@counterfactual/cf-funding-protocol-contracts/build/TwoPartyFixedOutcomeFromVirtualAppInterpreter.json";
import TwoPartyFixedOutcomeInterpreter from "@counterfactual/cf-funding-protocol-contracts/build/TwoPartyFixedOutcomeInterpreter.json";
import { NetworkContext } from "@counterfactual/types";
import { ContractFactory, Wallet } from "ethers";

export type NetworkContextForTestSuite = NetworkContext & {
  TicTacToeApp: string;
  DolphinCoin: string;
};

export async function deployTestArtifactsToChain(wallet: Wallet) {
  const coinBalanceRefundContract = await new ContractFactory(
    CoinBalanceRefundApp.abi,
    CoinBalanceRefundApp.bytecode,
    wallet
  ).deploy();

  const dolphinCoin = await new ContractFactory(
    DolphinCoin.abi,
    DolphinCoin.bytecode,
    wallet
  ).deploy();

  const identityApp = await new ContractFactory(
    IdentityApp.abi,
    IdentityApp.bytecode,
    wallet
  ).deploy();

  const mvmContract = await new ContractFactory(
    MinimumViableMultisig.abi,
    MinimumViableMultisig.bytecode,
    wallet
  ).deploy();

  const proxyFactoryContract = await new ContractFactory(
    ProxyFactory.abi,
    ProxyFactory.bytecode,
    wallet
  ).deploy();

  const coinTransferETHInterpreter = await new ContractFactory(
    MultiAssetMultiPartyCoinTransferInterpreter.abi,
    MultiAssetMultiPartyCoinTransferInterpreter.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeInterpreter.abi,
    TwoPartyFixedOutcomeInterpreter.bytecode,
    wallet
  ).deploy();

  const challengeRegistry = await new ContractFactory(
    ChallengeRegistry.abi,
    ChallengeRegistry.bytecode,
    wallet
  ).deploy();

  const conditionalTransactionDelegateTarget = await new ContractFactory(
    ConditionalTransactionDelegateTarget.abi,
    ConditionalTransactionDelegateTarget.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeFromVirtualAppETHInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.abi,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.bytecode,
    wallet
  ).deploy();

  const tttContract = await new ContractFactory(
    TicTacToeApp.abi,
    TicTacToeApp.bytecode,
    wallet
  ).deploy();

  const timeLockedPassThrough = await new ContractFactory(
    TimeLockedPassThrough.abi,
    TimeLockedPassThrough.bytecode,
    wallet
  ).deploy();

  const singleAssetTwoPartyCoinTransferInterpreter = await new ContractFactory(
    SingleAssetTwoPartyCoinTransferInterpreter.abi,
    SingleAssetTwoPartyCoinTransferInterpreter.bytecode,
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
