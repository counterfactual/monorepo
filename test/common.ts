import * as ethers from "ethers";

import { ActionName, ClientActionMessage, PeerBalance } from "../src/types";
import { ResponseStatus } from "../src/vm";
import { MULTISIG_ADDRESS } from "./environment";
import { TestWallet } from "./wallet/wallet";

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * A collection of static methods responsible for running the setup potocol
 * and asserting the machine state was correctly modified.
 */
export class SetupProtocol {
  public static async run(walletA: TestWallet, walletB: TestWallet) {
    SetupProtocol.validatePresetup(walletA, walletB);
    await SetupProtocol._run(walletA, walletB);
    SetupProtocol.validate(walletA, walletB);
  }

  /**
   * Asserts the state of the given wallets is empty.
   */
  public static validatePresetup(walletA: TestWallet, walletB: TestWallet) {
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
  public static validate(walletA: TestWallet, walletB: TestWallet) {
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
    walletA: TestWallet,
    walletB: TestWallet,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    // todo: add nonce and uniqueId params and check them
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

  private static async _run(walletA: TestWallet, walletB: TestWallet) {
    const msg = SetupProtocol.setupStartMsg(
      walletA.currentUser.address,
      walletB.currentUser.address
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
  }
}
