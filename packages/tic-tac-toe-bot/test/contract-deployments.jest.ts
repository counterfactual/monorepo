import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { ContractFactory, Wallet } from "ethers";

export async function configureNetworkContext(wallet: Wallet) {
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
    TicTacToeApp.interface,
    TicTacToeApp.bytecode,
    wallet
  ).deploy();

  return {
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToe: tttContract.address
  };
}
