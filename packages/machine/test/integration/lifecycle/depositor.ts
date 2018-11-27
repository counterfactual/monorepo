import * as cf from "@counterfactual/cf.js";
import { TestResponseSink } from "../test-response-sink";
import { ethers } from "ethers";
 import {
    UNUSED_FUNDED_ACCOUNT
  } from "../../utils/environment";


/**
 * A collection of staic methods responsible for "depositing", i.e., running
 * the intsall protocol with  "balance refund/withdraw" app, and ensuring
 * the machine state was correctly modified.
 */
export class Depositor {
  public static async makeDeposits(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ): Promise<any> {
    await Depositor.deposit(
      peerA,
      peerB,
      ethers.utils.bigNumberify(10),
      ethers.utils.bigNumberify(0)
    );
    await Depositor.deposit(
      peerB,
      peerA,
      ethers.utils.bigNumberify(5),
      ethers.utils.bigNumberify(10)
    );
  }

  /**
   * @param amountA is the amount wallet A wants to deposit into the channel.
   * @param amountBCumualtive is the amount wallet B already has in the channel,
   *        i.e., the threshold for the balance refund.
   */
  public static async deposit(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    amountA: ethers.utils.BigNumber,
    amountBCumlative: ethers.utils.BigNumber
  ) {
    const cfAddr = await Depositor.installBalanceRefund(
      peerA,
      peerB,
      amountBCumlative
    );
    await Depositor.uninstallBalanceRefund(
      cfAddr,
      peerA,
      peerB,
      amountA,
      amountBCumlative
    );
  }

  public static async installBalanceRefund(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    threshold: ethers.utils.BigNumber
  ) {
    const msg = Depositor.startInstallBalanceRefundMsg(
      peerA.signingKey.address!,
      peerB.signingKey.address!,
      threshold
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    // since the machine is async, we need to wait for peerB to finish up its
    // side of the protocol before inspecting it's state
    await cf.legacy.utils.sleep(50);
    // check B's client
    Depositor.validateInstalledBalanceRefund(peerA, peerB, threshold);
    // check A's client and return the newly created cf.legacy.signingKey.address
    return Depositor.validateInstalledBalanceRefund(peerA, peerB, threshold);
  }

  public static startInstallBalanceRefundMsg(
    from: string,
    to: string,
    threshold: ethers.utils.BigNumber
  ): cf.legacy.node.ClientActionMessage {
    const canon = cf.legacy.utils.PeerBalance.balances(
      from,
      ethers.utils.bigNumberify(0),
      to,
      ethers.utils.bigNumberify(0)
    );
    const terms = new cf.legacy.app.Terms(
      0,
      new ethers.utils.BigNumber(10),
      ethers.constants.AddressZero
    ); // TODO:
    const app = new cf.legacy.app.AppInterface(
      "0x0",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      ""
    ); // TODO:
    const timeout = 100;
    const installData: cf.legacy.app.InstallData = {
      terms,
      app,
      timeout,
      peerA: canon.peerA,
      peerB: canon.peerB,
      keyA: from,
      keyB: to,
      encodedAppState: "0x1234"
    };
    return {
      requestId: "1",
      appId: "",
      action: cf.legacy.node.ActionName.INSTALL,
      data: installData,
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  public static validateInstalledBalanceRefund(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    amount: ethers.utils.BigNumber
  ) {
    const stateChannel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    expect(stateChannel.me).toEqual(peerA.signingKey.address);
    expect(stateChannel.counterParty).toEqual(peerB.signingKey.address);

    const appInstances = stateChannel.appInstances;
    const cfAddrs = Object.keys(appInstances);
    expect(cfAddrs.length).toEqual(1);

    const cfAddr = cfAddrs[0];
    expect(appInstances[cfAddr].peerA.balance.toNumber()).toEqual(0);
    expect(appInstances[cfAddr].peerA.address).toEqual(
      stateChannel.freeBalance.alice
    );
    expect(appInstances[cfAddr].peerA.balance.toNumber()).toEqual(0);
    expect(appInstances[cfAddr].peerB.balance.toNumber()).toEqual(0);
    expect(appInstances[cfAddr].peerB.address).toEqual(
      stateChannel.freeBalance.bob
    );
    expect(appInstances[cfAddr].peerB.balance.toNumber()).toEqual(0);

    return cfAddr;
  }

  public static async uninstallBalanceRefund(
    cfAddr: string,
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    const msg = Depositor.startUninstallBalanceRefundMsg(
      cfAddr,
      peerA.signingKey.address!,
      peerB.signingKey.address!,
      amountA
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    // validate peerA
    Depositor.validateUninstall(cfAddr, peerA, peerB, amountA, amountB);
    // validate peerB
    Depositor.validateUninstall(cfAddr, peerB, peerA, amountB, amountA);
  }

  public static validateUninstall(
    cfAddr: string,
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    // TODO: add nonce and uniqueId params and check them
    // https://github.com/counterfactual/monorepo/issues/111
    const state = peerA.instructionExecutor.node;
    const canon = cf.legacy.utils.PeerBalance.balances(
      peerA.signingKey.address!,
      amountA,
      peerB.signingKey.address!,
      amountB
    );

    const channel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    const app = channel.appInstances[cfAddr];

    expect(Object.keys(state.channelStates).length).toEqual(1);
    expect(channel.me).toEqual(peerA.signingKey.address);
    expect(channel.counterParty).toEqual(peerB.signingKey.address);
    expect(channel.multisigAddress).toEqual(UNUSED_FUNDED_ACCOUNT);
    expect(channel.freeBalance.alice).toEqual(canon.peerA.address);
    expect(channel.freeBalance.bob).toEqual(canon.peerB.address);
    expect(channel.freeBalance.aliceBalance).toEqual(canon.peerA.balance);
    expect(channel.freeBalance.bobBalance).toEqual(canon.peerB.balance);
    expect(channel.freeBalance.uniqueId).toEqual(0);
    expect(app.dependencyNonce.nonceValue).toEqual(1);
  }

  public static startUninstallBalanceRefundMsg(
    appId: string,
    from: string,
    to: string,
    amount: ethers.utils.BigNumber
  ): cf.legacy.node.ClientActionMessage {
    const uninstallData = {
      peerAmounts: [
        new cf.legacy.utils.PeerBalance(from, amount),
        new cf.legacy.utils.PeerBalance(to, 0)
      ]
    };
    return {
      appId,
      requestId: "2",
      action: cf.legacy.node.ActionName.UNINSTALL,
      data: uninstallData,
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      fromAddress: from,
      toAddress: to,
      seq: 0
    };
  }
}
