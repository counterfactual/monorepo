import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { UNUSED_FUNDED_ACCOUNT } from "../utils/environment";

import { TestResponseSink } from "./test-response-sink";

/**
 * A collection of static methods responsible for running the setup potocol
 * and asserting the internally stored state was correctly modified.
 */
export class SetupProtocol {
  public static async validateAndRun(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    SetupProtocol.validatePresetup(peerA, peerB);
    await SetupProtocol.run(peerA, peerB);
    SetupProtocol.validatePostsetup(peerA, peerB);
  }

  /**
   * Asserts the state of the given wallets is empty.
   */
  public static validatePresetup(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    expect(peerA.instructionExecutor.node.channelStates).toEqual({});
    expect(peerB.instructionExecutor.node.channelStates).toEqual({});
  }

  public static setupStartMsg(
    from: string,
    to: string
  ): cf.legacy.node.ClientActionMessage {
    return {
      requestId: "0",
      appId: "",
      action: cf.legacy.node.ActionName.SETUP,
      data: {},
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  /**
   * Asserts the setup protocol modifies the internally stored state correctly.
   */
  public static validatePostsetup(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    SetupProtocol.validateWallet(
      peerA,
      peerB,
      ethers.utils.bigNumberify(0),
      ethers.utils.bigNumberify(0)
    );
    SetupProtocol.validateWallet(
      peerB,
      peerA,
      ethers.utils.bigNumberify(0),
      ethers.utils.bigNumberify(0)
    );
  }

  /**
   * Validates the correctness of walletAs free balance *not* walletBs.
   */
  public static validateWallet(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    // TODO: add nonce and uniqueId params and check them
    // https://github.com/counterfactual/monorepo/issues/111
    const state = peerA.instructionExecutor.node;
    const canon = cf.legacy.utils.PeerBalance.balances(
      peerA.signingKey.address,
      amountA,
      peerB.signingKey.address,
      amountB
    );
    const channel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    expect(Object.keys(state.channelStates).length).toEqual(1);
    expect(channel.counterParty).toEqual(peerB.signingKey.address);
    expect(channel.me).toEqual(peerA.signingKey.address);
    expect(channel.multisigAddress).toEqual(UNUSED_FUNDED_ACCOUNT);
    expect(channel.appInstances).toEqual({});
    expect(channel.freeBalance.alice).toEqual(canon.peerA.address);
    expect(channel.freeBalance.bob).toEqual(canon.peerB.address);
    expect(channel.freeBalance.aliceBalance).toEqual(canon.peerA.balance);
    expect(channel.freeBalance.bobBalance).toEqual(canon.peerB.balance);
  }

  private static async run(peerA: TestResponseSink, peerB: TestResponseSink) {
    const msg = SetupProtocol.setupStartMsg(
      peerA.signingKey.address,
      peerB.signingKey.address
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
  }
}
