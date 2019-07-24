import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import CoinTransferInterpreter from "@counterfactual/contracts/build/CoinTransferInterpreter.json";
import ConditionalTransactionDelegateTarget from "@counterfactual/contracts/build/ConditionalTransactionDelegateTarget.json";
import BalanceRefundApp from "@counterfactual/contracts/build/ETHBalanceRefundApp.json";
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
};

export async function deployTestArtifactsToChain(wallet: Wallet) {
  const balanceRefundContract = await new ContractFactory(
    BalanceRefundApp.abi,
    BalanceRefundApp.bytecode,
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
    CoinTransferInterpreter.abi,
    CoinTransferInterpreter.bytecode,
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
    ETHBalanceRefundApp: balanceRefundContract.address,
    FreeBalanceApp: freeBalanceAppContract.address,
    IdentityApp: identityApp.address,
    CoinTransferInterpreter: coinTransferETHInterpreter.address,
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToeApp: tttContract.address,
    TwoPartyFixedOutcomeETHInterpreter:
      twoPartyFixedOutcomeETHInterpreter.address,
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter:
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter.address
  } as NetworkContextForTestSuite;
}
