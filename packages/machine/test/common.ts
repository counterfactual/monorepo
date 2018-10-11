import AppInstance from "../../contracts/build/contracts/AppInstance.json";
import ConditionalTransfer from "../../contracts/build/contracts/ConditionalTransfer.json";
import ETHBalanceRefundApp from "../../contracts/build/contracts/ETHBalanceRefundApp.json";
import MinimumViableMultisig from "../../contracts/build/contracts/MinimumViableMultisig.json";
import MultiSend from "../../contracts/build/contracts/MultiSend.json";
import NonceRegistry from "../../contracts/build/contracts/NonceRegistry.json";
import PaymentApp from "../../contracts/build/contracts/PaymentApp.json";
import Registry from "../../contracts/build/contracts/Registry.json";
import Signatures from "../../contracts/build/contracts/Signatures.json";
import StaticCall from "../../contracts/build/contracts/StaticCall.json";
import networkFile from "../../contracts/networks/7777777.json";

import * as wallet from "@counterfactual/wallet";
import * as ethers from "ethers";

import {
  ActionName,
  ClientActionMessage,
  NetworkContext,
  PeerBalance
} from "../src/types";
import { ResponseStatus } from "../src/vm";
import { MULTISIG_ADDRESS } from "./environment";

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Temporary placeholder until wallet can independently handle contracts network
function getContractArtifacts() {
  const artifacts = new Map();
  artifacts[NetworkContext.CONTRACTS.Registry] = [
    JSON.stringify(Registry.abi),
    Registry.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.PaymentApp] = [
    JSON.stringify(PaymentApp.abi),
    PaymentApp.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.ConditionalTransfer] = [
    JSON.stringify(ConditionalTransfer.abi),
    ConditionalTransfer.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.MultiSend] = [
    JSON.stringify(MultiSend.abi),
    MultiSend.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.NonceRegistry] = [
    JSON.stringify(NonceRegistry.abi),
    NonceRegistry.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.Signatures] = [
    JSON.stringify(Signatures.abi),
    Signatures.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.StaticCall] = [
    JSON.stringify(StaticCall.abi),
    StaticCall.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.ETHBalanceRefundApp] = [
    JSON.stringify(ETHBalanceRefundApp.abi),
    ETHBalanceRefundApp.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.Multisig] = [
    JSON.stringify(MinimumViableMultisig.abi),
    MinimumViableMultisig.bytecode
  ];
  artifacts[NetworkContext.CONTRACTS.AppInstance] = [
    JSON.stringify(AppInstance.abi),
    AppInstance.bytecode
  ];
  return artifacts;
}

// Temporary placeholder until wallet can independently handle contracts network
export function defaultNetwork(): NetworkContext {
  const contractArtifacts = getContractArtifacts();
  return NetworkContext.fromDeployment(networkFile, contractArtifacts);
}

/**
 * A collection of static methods responsible for running the setup potocol
 * and asserting the machine state was correctly modified.
 */
export class SetupProtocol {
  public static async run(
    walletA: wallet.IframeWallet,
    walletB: wallet.IframeWallet
  ) {
    SetupProtocol.validatePresetup(walletA, walletB);
    await SetupProtocol._run(walletA, walletB);
    SetupProtocol.validate(walletA, walletB);
  }

  /**
   * Asserts the state of the given wallets is empty.
   */
  public static validatePresetup(
    walletA: wallet.IframeWallet,
    walletB: wallet.IframeWallet
  ) {
    expect(walletA.currentUser.vm.cfState.channelStates).toEqual({});
    expect(walletB.currentUser.vm.cfState.channelStates).toEqual({});
  }

  public static setupStartMsg(from: string, to: string): ClientActionMessage {
    return {
      requestId: "0",
      appId: "",
      action: ActionName.SETUP,
      data: {},
      multisigAddress: MULTISIG_ADDRESS,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  /**
   * Asserts the setup protocol modifies the machine state correctly.
   */
  public static validate(
    walletA: wallet.IframeWallet,
    walletB: wallet.IframeWallet
  ) {
    SetupProtocol.validateWallet(
      walletA,
      walletB,
      ethers.utils.bigNumberify(0),
      ethers.utils.bigNumberify(0)
    );
    SetupProtocol.validateWallet(
      walletB,
      walletA,
      ethers.utils.bigNumberify(0),
      ethers.utils.bigNumberify(0)
    );
  }

  /**
   * Validates the correctness of walletAs free balance *not* walletBs.
   */
  public static validateWallet(
    walletA: wallet.IframeWallet,
    walletB: wallet.IframeWallet,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    // TODO: add nonce and uniqueId params and check them
    const state = walletA.currentUser.vm.cfState;
    const canon = PeerBalance.balances(
      walletA.currentUser.address,
      amountA,
      walletB.currentUser.address,
      amountB
    );
    const channel =
      walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
    expect(Object.keys(state.channelStates).length).toEqual(1);
    expect(channel.counterParty).toEqual(walletB.address);
    expect(channel.me).toEqual(walletA.address);
    expect(channel.multisigAddress).toEqual(MULTISIG_ADDRESS);
    expect(channel.appChannels).toEqual({});
    expect(channel.freeBalance.alice).toEqual(canon.peerA.address);
    expect(channel.freeBalance.bob).toEqual(canon.peerB.address);
    expect(channel.freeBalance.aliceBalance).toEqual(canon.peerA.balance);
    expect(channel.freeBalance.bobBalance).toEqual(canon.peerB.balance);
  }

  private static async _run(
    walletA: wallet.IframeWallet,
    walletB: wallet.IframeWallet
  ) {
    const msg = SetupProtocol.setupStartMsg(
      walletA.currentUser.address,
      walletB.currentUser.address
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
  }
}
