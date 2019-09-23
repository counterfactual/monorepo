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

export async function deployed(artifacts: any, wallet: Wallet) {
  const contract = await new ContractFactory(
    artifacts.abi,
    artifacts.evm.bytecode,
    wallet
  ).deploy();

  await contract.deployed();
  return contract;
}

export async function deployTestArtifactsToChain(wallet: Wallet) {
  const coinBalanceRefundContract = await deployed(
    CoinBalanceRefundApp,
    wallet
  );

  const dolphinCoin = await deployed(DolphinCoin, wallet);

  const identityApp = await deployed(IdentityApp, wallet);

  const mvmContract = await deployed(MinimumViableMultisig, wallet);

  const proxyFactoryContract = await deployed(ProxyFactory, wallet);

  const coinTransferETHInterpreter = await deployed(
    MultiAssetMultiPartyCoinTransferInterpreter,
    wallet
  );

  const twoPartyFixedOutcomeInterpreter = await deployed(
    TwoPartyFixedOutcomeInterpreter,
    wallet
  );

  const challengeRegistry = await deployed(ChallengeRegistry, wallet);

  const conditionalTransactionDelegateTarget = await deployed(
    ConditionalTransactionDelegateTarget,
    wallet
  );

  const twoPartyFixedOutcomeFromVirtualAppETHInterpreter = await deployed(
    TwoPartyFixedOutcomeFromVirtualAppInterpreter,
    wallet
  );

  const tttContract = await deployed(TicTacToeApp, wallet);

  const transferContract = await deployed(UnidirectionalTransferApp, wallet);

  const simpleTransferContract = await deployed(SimpleTransferApp, wallet);

  const linkContract = await deployed(UnidirectionalLinkedTransferApp, wallet);

  const timeLockedPassThrough = await deployed(TimeLockedPassThrough, wallet);

  const singleAssetTwoPartyCoinTransferInterpreter = await deployed(
    SingleAssetTwoPartyCoinTransferInterpreter,
    wallet
  );

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
