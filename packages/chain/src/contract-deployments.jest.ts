import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import CoinBalanceRefundApp from "@counterfactual/contracts/build/CoinBalanceRefundApp.json";
import CoinTransferETHInterpreter from "@counterfactual/contracts/build/CoinTransferETHInterpreter.json";
import ConditionalTransactionDelegateTarget from "@counterfactual/contracts/build/ConditionalTransactionDelegateTarget.json";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import FreeBalanceApp from "@counterfactual/contracts/build/FreeBalanceApp.json";
import IdentityApp from "@counterfactual/contracts/build/IdentityApp.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import TwoPartyFixedOutcomeETHInterpreter from "@counterfactual/contracts/build/TwoPartyFixedOutcomeETHInterpreter.json";
import TwoPartyFixedOutcomeFromVirtualAppETHInterpreter from "@counterfactual/contracts/build/TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.json";
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

  const freeBalanceAppContract = await new ContractFactory(
    FreeBalanceApp.abi,
    FreeBalanceApp.bytecode,
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
    CoinTransferETHInterpreter.abi,
    CoinTransferETHInterpreter.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeETHInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeETHInterpreter.abi,
    TwoPartyFixedOutcomeETHInterpreter.bytecode,
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
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.abi,
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.bytecode,
    wallet
  ).deploy();

  const tttContract = await new ContractFactory(
    TicTacToeApp.abi,
    TicTacToeApp.bytecode,
    wallet
  ).deploy();

  return {
    ChallengeRegistry: challengeRegistry.address,
    ConditionalTransactionDelegateTarget:
      conditionalTransactionDelegateTarget.address,
    FreeBalanceApp: freeBalanceAppContract.address,
    IdentityApp: identityApp.address,
    CoinTransferETHInterpreter: coinTransferETHInterpreter.address,
    CoinBalanceRefundApp: coinBalanceRefundContract.address,
    DolphinCoin: dolphinCoin.address,
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToeApp: tttContract.address,
    TwoPartyFixedOutcomeETHInterpreter:
      twoPartyFixedOutcomeETHInterpreter.address,
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter:
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter.address
  } as NetworkContextForTestSuite;
}
