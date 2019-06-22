import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import ConditionalTransactionDelegateTarget from "@counterfactual/contracts/build/ConditionalTransactionDelegateTarget.json";
import BalanceRefundApp from "@counterfactual/contracts/build/ETHBalanceRefundApp.json";
import ETHBucket from "@counterfactual/contracts/build/ETHBucket.json";
import ETHInterpreter from "@counterfactual/contracts/build/ETHInterpreter.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import MultiSend from "@counterfactual/contracts/build/MultiSend.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import RootNonceRegistry from "@counterfactual/contracts/build/RootNonceRegistry.json";
import TwoPartyEthAsLump from "@counterfactual/contracts/build/TwoPartyEthAsLump.json";
import TwoPartyVirtualEthAsLump from "@counterfactual/contracts/build/TwoPartyVirtualEthAsLump.json";
import UninstallKeyRegistry from "@counterfactual/contracts/build/UninstallKeyRegistry.json";
import { NetworkContext } from "@counterfactual/types";
import { ContractFactory, Wallet } from "ethers";

export async function configureNetworkContext(wallet: Wallet) {
  const balanceRefundContract = await new ContractFactory(
    BalanceRefundApp.abi,
    BalanceRefundApp.bytecode,
    wallet
  ).deploy();

  const ethBucketContract = await new ContractFactory(
    ETHBucket.abi,
    ETHBucket.bytecode,
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

  const tttContract = await new ContractFactory(
    TicTacToeApp.abi,
    TicTacToeApp.bytecode,
    wallet
  ).deploy();

  const ethInterpreter = await new ContractFactory(
    ETHInterpreter.abi,
    ETHInterpreter.bytecode,
    wallet
  ).deploy();

  const twoPartyEthAsLump = await new ContractFactory(
    TwoPartyEthAsLump.abi,
    TwoPartyEthAsLump.bytecode,
    wallet
  ).deploy();

  const appRegistry = await new ContractFactory(
    ChallengeRegistry.abi,
    ChallengeRegistry.bytecode,
    wallet
  ).deploy();

  const multiSend = await new ContractFactory(
    MultiSend.abi,
    MultiSend.bytecode,
    wallet
  ).deploy();

  const rootNonceRegistry = await new ContractFactory(
    RootNonceRegistry.abi,
    RootNonceRegistry.bytecode,
    wallet
  ).deploy();

  const uninstallKeyRegistry = await new ContractFactory(
    UninstallKeyRegistry.abi,
    UninstallKeyRegistry.bytecode,
    wallet
  ).deploy();

  const conditionalTransactionDelegateTarget = await new ContractFactory(
    ConditionalTransactionDelegateTarget.abi,
    ConditionalTransactionDelegateTarget.bytecode,
    wallet
  ).deploy();

  const twoPartyVirtualEthAsLump = await new ContractFactory(
    TwoPartyVirtualEthAsLump.abi,
    TwoPartyVirtualEthAsLump.bytecode,
    wallet
  ).deploy();

  return {
    ETHBalanceRefundApp: balanceRefundContract.address,
    ETHBucket: ethBucketContract.address,
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToe: tttContract.address,
    ETHInterpreter: ethInterpreter.address,
    TwoPartyEthAsLump: twoPartyEthAsLump.address,
    ChallengeRegistry: appRegistry.address,
    MultiSend: multiSend.address,
    RootNonceRegistry: rootNonceRegistry.address,
    UninstallKeyRegistry: uninstallKeyRegistry.address,
    ConditionalTransactionDelegateTarget:
      conditionalTransactionDelegateTarget.address,
    TwoPartyVirtualEthAsLump: twoPartyVirtualEthAsLump.address
  } as NetworkContext;
}
