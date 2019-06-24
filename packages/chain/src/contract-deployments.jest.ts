import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import CoinBalanceRefundApp from "@counterfactual/contracts/build/CoinBalanceRefundApp.json";
import CoinBucket from "@counterfactual/contracts/build/CoinBucket.json";
import CoinInterpreter from "@counterfactual/contracts/build/CoinInterpreter.json";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import MultiSend from "@counterfactual/contracts/build/MultiSend.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import RootNonceRegistry from "@counterfactual/contracts/build/RootNonceRegistry.json";
import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import TwoPartyEthAsLump from "@counterfactual/contracts/build/TwoPartyEthAsLump.json";
import TwoPartyVirtualEthAsLump from "@counterfactual/contracts/build/TwoPartyVirtualEthAsLump.json";
import UninstallKeyRegistry from "@counterfactual/contracts/build/UninstallKeyRegistry.json";
import { NetworkContext } from "@counterfactual/types";
import { ContractFactory, Wallet } from "ethers";

export async function configureNetworkContext(wallet: Wallet) {
  const dolphinCoinContract = await new ContractFactory(
    DolphinCoin.abi,
    DolphinCoin.bytecode,
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

  const coinBucketContract = await new ContractFactory(
    CoinBucket.abi,
    CoinBucket.bytecode,
    wallet
  ).deploy();

  const coinBalanceRefundContract = await new ContractFactory(
    CoinBalanceRefundApp.abi,
    CoinBalanceRefundApp.bytecode,
    wallet
  ).deploy();

  const coinInterpreter = await new ContractFactory(
    CoinInterpreter.abi,
    CoinInterpreter.bytecode,
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

  const stateChannelTransaction = await new ContractFactory(
    StateChannelTransaction.abi,
    StateChannelTransaction.bytecode,
    wallet
  ).deploy();

  const twoPartyVirtualEthAsLump = await new ContractFactory(
    TwoPartyVirtualEthAsLump.abi,
    TwoPartyVirtualEthAsLump.bytecode,
    wallet
  ).deploy();

  return {
    CoinBalanceRefundApp: coinBalanceRefundContract.address,
    CoinBucket: coinBucketContract.address,
    CoinInterpreter: coinInterpreter.address,
    DolphinCoin: dolphinCoinContract.address,
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToe: tttContract.address,
    TwoPartyEthAsLump: twoPartyEthAsLump.address,
    ChallengeRegistry: appRegistry.address,
    MultiSend: multiSend.address,
    RootNonceRegistry: rootNonceRegistry.address,
    UninstallKeyRegistry: uninstallKeyRegistry.address,
    StateChannelTransaction: stateChannelTransaction.address,
    TwoPartyVirtualEthAsLump: twoPartyVirtualEthAsLump.address
  } as NetworkContext;
}
