import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { UNUSED_FUNDED_ACCOUNT } from "../utils/environment";

import { TestResponseSink } from "./test-response-sink";

/**
 * A collection of static methods responsible for running the setup potocol
 * and asserting the internally stored state was correctly modified.
 */
export class SetupProtocol {
  public static async run(peerA: TestResponseSink, peerB: TestResponseSink) {
    SetupProtocol.validatePresetup(peerA, peerB);
    await SetupProtocol.run2(peerA, peerB);
    SetupProtocol.validate(peerA, peerB);
  }

  /**
   * Asserts the state of the given wallets is empty.
   */
  public static validatePresetup(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    expect(peerA.vm.state.channelStates).toEqual({});
    expect(peerB.vm.state.channelStates).toEqual({});
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
   * Asserts the setup protocol modifies the internally stored state correctly.
   */
  public static validate(peerA: TestResponseSink, peerB: TestResponseSink) {
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
    const state = peerA.vm.state;
    const canon = cf.utils.PeerBalance.balances(
      peerA.signingKey.address,
      amountA,
      peerB.signingKey.address,
      amountB
    );
    const channel = peerA.vm.state.channelStates[UNUSED_FUNDED_ACCOUNT];
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

  // TODO: Better name
  // https://github.com/counterfactual/monorepo/issues/104
  private static async run2(peerA: TestResponseSink, peerB: TestResponseSink) {
    const msg = SetupProtocol.setupStartMsg(
      peerA.signingKey.address,
      peerB.signingKey.address
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.node.ResponseStatus.COMPLETED);
  }
}
