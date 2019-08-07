import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/build/MinimumViableMultisig.json";
import MultiAssetMultiPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/build/MultiAssetMultiPartyCoinTransferInterpreter.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/build/ProxyFactory.json";
import TwoPartyFixedOutcomeFromVirtualAppInterpreter from "@counterfactual/cf-funding-protocol-contracts/build/TwoPartyFixedOutcomeFromVirtualAppInterpreter.json";
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
    MultiAssetMultiPartyCoinTransferInterpreter.abi,
    MultiAssetMultiPartyCoinTransferInterpreter.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeFromVirtualAppETHInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.abi,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.bytecode,
    wallet
  ).deploy();

  return {
    MinimumViableMultisig: mvmContract.address,
    ProxyFactory: proxyFactoryContract.address,
    TicTacToe: tttContract.address,
    MultiAssetMultiPartyCoinTransferInterpreter:
      coinTransferETHInterpreter.address,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter:
      twoPartyFixedOutcomeFromVirtualAppETHInterpreter.address
  };
}
