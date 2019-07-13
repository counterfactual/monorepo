import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import CoinTransferInterpreter from "@counterfactual/contracts/build/CoinTransferInterpreter.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import TwoPartyFixedOutcomeFromVirtualAppETHInterpreter from "@counterfactual/contracts/build/TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.json";
import { ContractFactory, Wallet } from "ethers";

export async function deployTestArtifactsToChain(wallet: Wallet) {
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

  const coinTransferETHInterpreter = await new ContractFactory(
    CoinTransferInterpreter.abi,
    CoinTransferInterpreter.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeFromVirtualAppETHInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.abi,
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.bytecode,
    wallet
  ).deploy();

  return {
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToe: tttContract.address,
    CoinTransferInterpreter: coinTransferETHInterpreter.address,
    TwoPartyFixedOutcomeFromVirtualAppETHInterpreter:
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter.address
  };
}
