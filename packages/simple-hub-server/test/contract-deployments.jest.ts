import TicTacToeApp from "@counterfactual/apps/expected-build-artifacts/TicTacToeApp.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import MultiAssetMultiPartyCoinTransferInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MultiAssetMultiPartyCoinTransferInterpreter.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ProxyFactory.json";
import TwoPartyFixedOutcomeFromVirtualAppInterpreter from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/TwoPartyFixedOutcomeFromVirtualAppInterpreter.json";
import { ContractFactory, Wallet } from "ethers";

export async function deployTestArtifactsToChain(wallet: Wallet) {
  const mvmContract = await new ContractFactory(
    MinimumViableMultisig.abi,
    MinimumViableMultisig.evm.bytecode,
    wallet
  ).deploy();

  const proxyFactoryContract = await new ContractFactory(
    ProxyFactory.abi,
    ProxyFactory.evm.bytecode,
    wallet
  ).deploy();

  const tttContract = await new ContractFactory(
    TicTacToeApp.abi,
    TicTacToeApp.evm.bytecode,
    wallet
  ).deploy();

  const coinTransferETHInterpreter = await new ContractFactory(
    MultiAssetMultiPartyCoinTransferInterpreter.abi,
    MultiAssetMultiPartyCoinTransferInterpreter.evm.bytecode,
    wallet
  ).deploy();

  const twoPartyFixedOutcomeFromVirtualAppETHInterpreter = await new ContractFactory(
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.abi,
    TwoPartyFixedOutcomeFromVirtualAppInterpreter.evm.bytecode,
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
