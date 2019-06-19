import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import ERC20BalanceRefundApp from "@counterfactual/contracts/build/ERC20BalanceRefundApp.json";
import ERC20Bucket from "@counterfactual/contracts/build/ERC20Bucket.json";
import ERC20Interpreter from "@counterfactual/contracts/build/ERC20TwoPartyDynamicInterpreter.json";
import BalanceRefundApp from "@counterfactual/contracts/build/ETHBalanceRefundApp.json";
import ETHBucket from "@counterfactual/contracts/build/ETHBucket.json";
import ETHInterpreter from "@counterfactual/contracts/build/ETHInterpreter.json";
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

  const erc20BucketContract = await new ContractFactory(
    ERC20Bucket.abi,
    ERC20Bucket.bytecode,
    wallet
  ).deploy();

  const erc20BalanceRefundContract = await new ContractFactory(
    ERC20BalanceRefundApp.abi,
    ERC20BalanceRefundApp.bytecode,
    wallet
  ).deploy();

  const erc20Interpreter = await new ContractFactory(
    ERC20Interpreter.abi,
    ERC20Interpreter.bytecode,
    wallet
  ).deploy();

  const ethBucketContract = await new ContractFactory(
    ETHBucket.abi,
    ETHBucket.bytecode,
    wallet
  ).deploy();

  const balanceRefundContract = await new ContractFactory(
    BalanceRefundApp.abi,
    BalanceRefundApp.bytecode,
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
    DolphinCoin: dolphinCoinContract.address,
    ERC20BalanceRefundApp: erc20BalanceRefundContract.address,
    ERC20Bucket: erc20BucketContract.address,
    ERC20TwoPartyDynamicInterpreter: erc20Interpreter.address,
    ETHBalanceRefundApp: balanceRefundContract.address,
    ETHBucket: ethBucketContract.address,
    ETHInterpreter: ethInterpreter.address,
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
