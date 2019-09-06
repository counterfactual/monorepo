import SimpleTransferApp from "@counterfactual/apps/expected-build-artifacts/SimpleTransferApp.json";
import TicTacToeApp from "@counterfactual/apps/expected-build-artifacts/TicTacToeApp.json";
import UnidirectionalLinkedTransferApp from "@counterfactual/apps/expected-build-artifacts/UnidirectionalLinkedTransferApp.json";
import UnidirectionalTransferApp from "@counterfactual/apps/expected-build-artifacts/UnidirectionalTransferApp.json";
import ChallengeRegistry from "@counterfactual/cf-adjudicator-contracts/expected-build-artifacts/ChallengeRegistry.json";
import CoinBalanceRefundApp from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/CoinBalanceRefundApp.json";
import ConditionalTransactionDelegateTarget from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ConditionalTransactionDelegateTarget.json";
import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/DolphinCoin.json";
import IdentityApp from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/IdentityApp.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import MultiAssetMultiPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MultiAssetMultiPartyCoinTransferInterpreter.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ProxyFactory.json";
import SingleAssetTwoPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/SingleAssetTwoPartyCoinTransferInterpreter.json";
import TimeLockedPassThrough from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/TimeLockedPassThrough.json";
import TwoPartyFixedOutcomeFromVirtualAppInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/TwoPartyFixedOutcomeFromVirtualAppInterpreter.json";
import TwoPartyFixedOutcomeInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/TwoPartyFixedOutcomeInterpreter.json";
import { NetworkContext } from "@counterfactual/types";
import { ContractFactory, Wallet } from "ethers";

export type NetworkContextForTestSuite = NetworkContext & {
  TicTacToeApp: string;
  DolphinCoin: string;
  UnidirectionalTransferApp: string;
  UnidirectionalLinkedTransferApp: string;
  SimpleTransferApp: string;
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

  const transferContract = await new ContractFactory(
    UnidirectionalTransferApp.abi,
    UnidirectionalTransferApp.evm.bytecode,
    wallet
  ).deploy();

  const simpleTransferContract = await new ContractFactory(
    SimpleTransferApp.abi,
    SimpleTransferApp.evm.bytecode,
    wallet
  ).deploy();

  const linkContract = await new ContractFactory(
    UnidirectionalLinkedTransferApp.abi,
    UnidirectionalLinkedTransferApp.evm.bytecode,
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
    SimpleTransferApp: simpleTransferContract.address,
    TicTacToeApp: tttContract.address,
    TimeLockedPassThrough: timeLockedPassThrough.address,
    TwoPartyFixedOutcomeInterpreter: twoPartyFixedOutcomeInterpreter.address,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter:
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter.address,
    UnidirectionalLinkedTransferApp: linkContract.address,
    UnidirectionalTransferApp: transferContract.address
  } as NetworkContextForTestSuite;
}
