import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { IFrameWallet } from "../src/iframe/wallet";

import { UNUSED_FUNDED_ACCOUNT } from "./environment";

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const EMPTY_NETWORK_CONTEXT = new cf.utils.NetworkContext(
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero
);

/**
 * A collection of static methods responsible for running the setup potocol
 * and asserting the machine state was correctly modified.
 */
export class SetupProtocol {
  public static async run(walletA: IFrameWallet, walletB: IFrameWallet) {
    SetupProtocol.validatePresetup(walletA, walletB);
    await SetupProtocol.run2(walletA, walletB);
    SetupProtocol.validate(walletA, walletB);
  }

  /**
   * Asserts the state of the given wallets is empty.
   */
  public static validatePresetup(walletA: IFrameWallet, walletB: IFrameWallet) {
    expect(
      walletA.currentUser.instructionExecutor.nodeState.channelStates
    ).toEqual({});
    expect(
      walletB.currentUser.instructionExecutor.nodeState.channelStates
    ).toEqual({});
  }

  public static setupStartMsg(
    from: string,
    to: string
  ): cf.node.ClientActionMessage {
    return {
      requestId: "0",
      appId: "",
      action: cf.node.ActionName.SETUP,
      data: {},
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  /**
   * Asserts the setup protocol modifies the machine state correctly.
   */
  public static validate(walletA: IFrameWallet, walletB: IFrameWallet) {
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
    walletA: IFrameWallet,
    walletB: IFrameWallet,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    // TODO: add nonce and uniqueId params and check them
    const state = walletA.currentUser.instructionExecutor.nodeState;
    const canon = cf.utils.PeerBalance.balances(
      walletA.currentUser.address,
      amountA,
      walletB.currentUser.address,
      amountB
    );
    const channel =
      walletA.currentUser.instructionExecutor.nodeState.channelStates[
        UNUSED_FUNDED_ACCOUNT
      ];
    expect(Object.keys(state.channelStates).length).toEqual(1);
    expect(channel.counterParty).toEqual(walletB.address);
    expect(channel.me).toEqual(walletA.address);
    expect(channel.multisigAddress).toEqual(UNUSED_FUNDED_ACCOUNT);
    expect(channel.appInstances).toEqual({});
    expect(channel.freeBalance.alice).toEqual(canon.peerA.address);
    expect(channel.freeBalance.bob).toEqual(canon.peerB.address);
    expect(channel.freeBalance.aliceBalance).toEqual(canon.peerA.balance);
    expect(channel.freeBalance.bobBalance).toEqual(canon.peerB.balance);
  }

  // TODO: Better naming
  private static async run2(walletA: IFrameWallet, walletB: IFrameWallet) {
    const msg = SetupProtocol.setupStartMsg(
      walletA.currentUser.address,
      walletB.currentUser.address
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(cf.node.ResponseStatus.COMPLETED);
  }
}
