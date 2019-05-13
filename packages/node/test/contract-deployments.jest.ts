import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import BalanceRefundApp from "@counterfactual/contracts/build/ETHBalanceRefundApp.json";
import ETHBucket from "@counterfactual/contracts/build/ETHBucket.json";
import ETHInterpreter from "@counterfactual/contracts/build/ETHInterpreter.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import TwoPartyEthAsLump from "@counterfactual/contracts/build/TwoPartyEthAsLump.json";
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

  return {
    ETHBalanceRefundApp: balanceRefundContract.address,
    ETHBucket: ethBucketContract.address,
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToe: tttContract.address,
    ETHInterpreter: ethInterpreter.address,
    TwoPartyEthAsLump: twoPartyEthAsLump.address
  };
}
