import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import {
  A_PRIVATE_KEY,
  B_PRIVATE_KEY,
  UNUSED_FUNDED_ACCOUNT
} from "../utils/environment";

import { TestResponseSink } from "./test-response-sink";
import { SetupProtocol } from "./setup-protocol";

/**
 * Tests that the machine's State is correctly modified during the lifecycle
 * of a state channel application, TicTacToeSimulator, running the setup, install, update,
 * and uninstall protocols.
 */
describe("Machine State Lifecycle", async () => {
  // extending the timeout to allow the async machines to finish
  // and give time to `recoverAddress` to order signing keys right
  // for setting commitments
  jest.setTimeout(50000);

  it.only("should modify machine state during the lifecycle of TicTacToeSimulator", async () => {
    const [peerA, peerB]: TestResponseSink[] = getCommunicatingPeers();
    await SetupProtocol.validateAndRun(peerA, peerB);
    await Depositor.makeDeposits(peerA, peerB);
    await TicTacToeSimulator.simulatePlayingGame(peerA, peerB);
  });
});

/**
 * @returns the wallets containing the machines that will be used for the test.
 */
function getCommunicatingPeers(): TestResponseSink[] {
  // TODO: Document somewhere that the .signingKey.address" *must* be a hex otherwise
  // machine/src/middleware/node-transition/install-proposer.ts:98:14
  // will throw an error when doing BigNumber.gt check.
  // https://github.com/counterfactual/monorepo/issues/110

  // TODO: Furthermore document that these will eventually be used to generate
  // the `signingKeys` in any proposals e.g., InstallProposer, thus the proposal
  // will fail if they are not valid Ethereum addresses
  // https://github.com/counterfactual/monorepo/issues/109
  const peerA = new TestResponseSink(A_PRIVATE_KEY);
  const peerB = new TestResponseSink(B_PRIVATE_KEY);

  peerA.io.peer = peerB;
  peerB.io.peer = peerA;

  return [peerA, peerB];
}

/**
 * A collection of staic methods responsible for "depositing", i.e., running
 * the intsall protocol with  "balance refund/withdraw" app, and ensuring
 * the machine state was correctly modified.
 */
class Depositor {
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

class TicTacToeSimulator {
  public static async simulatePlayingGame(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    const cfAddr = await TicTacToeSimulator.installTtt(peerA, peerB);
    await TicTacToeSimulator.makeMoves(peerA, peerB, cfAddr);
    await TicTacToeSimulator.uninstall(peerA, peerB, cfAddr);
    return cfAddr;
  }

  public static async installTtt(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    const msg = TicTacToeSimulator.installMsg(
      peerA.signingKey.address!,
      peerB.signingKey.address!
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    return TicTacToeSimulator.validateInstall(peerA, peerB);
  }

  public static installMsg(
    to: string,
    from: string
  ): cf.legacy.node.ClientActionMessage {
    let peerA = from;
    let peerB = to;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
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
      peerA: new cf.legacy.utils.PeerBalance(peerA, 2),
      peerB: new cf.legacy.utils.PeerBalance(peerB, 2),
      keyA: peerA,
      keyB: peerB,
      encodedAppState: "0x1234"
    };
    return {
      requestId: "5",
      appId: "",
      action: cf.legacy.node.ActionName.INSTALL,
      data: installData,
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  public static async validateInstall(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ): Promise<string> {
    TicTacToeSimulator.validateInstallWallet(peerA, peerB);
    // Wait for other client to finish, since the machine is async
    await cf.legacy.utils.sleep(50);
    return TicTacToeSimulator.validateInstallWallet(peerB, peerA);
  }

  public static validateInstallWallet(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ): string {
    const stateChannel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    const appInstances = stateChannel.appInstances;
    const cfAddrs = Object.keys(appInstances);
    expect(cfAddrs.length).toEqual(1);

    // first validate the app
    const cfAddr = cfAddrs[0];
    expect(appInstances[cfAddr].peerA.balance.toNumber()).toEqual(2);
    expect(appInstances[cfAddr].peerB.balance.toNumber()).toEqual(2);

    // now validate the free balance
    const channel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    // start with 10, 5 and both parties deposit 2 into TicTacToeSimulator.
    expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(8);
    expect(channel.freeBalance.bobBalance.toNumber()).toEqual(3);
    return cfAddr;
  }

  /**
   * Game is over at the end of this functon call and is ready to be uninstalled.
   */
  public static async makeMoves(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr: string
  ) {
    const state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const X = 1;
    const O = 2;

    await TicTacToeSimulator.makeMove(peerA, peerB, cfAddr, state, 0, X, 1);
    await TicTacToeSimulator.makeMove(peerB, peerA, cfAddr, state, 4, O, 2);
    await TicTacToeSimulator.makeMove(peerA, peerB, cfAddr, state, 1, X, 3);
    await TicTacToeSimulator.makeMove(peerB, peerA, cfAddr, state, 5, O, 4);
    await TicTacToeSimulator.makeMove(peerA, peerB, cfAddr, state, 2, X, 5);
  }

  public static async makeMove(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr: string,
    appState: number[],
    cell: number,
    side: number,
    moveNumber: number
  ) {
    appState[cell] = side;
    const state = appState.toString();
    const msg = TicTacToeSimulator.updateMsg(
      state,
      cell,
      peerA.signingKey.address!,
      peerB.signingKey.address!,
      cfAddr
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    TicTacToeSimulator.validateMakeMove(
      peerA,
      peerB,
      cfAddr,
      state,
      moveNumber
    );
    await cf.legacy.utils.sleep(50);
    TicTacToeSimulator.validateMakeMove(
      peerB,
      peerA,
      cfAddr,
      state,
      moveNumber
    );
  }

  public static updateMsg(
    state: string,
    cell: number,
    to: string,
    from: string,
    cfAddr: string
  ): cf.legacy.node.ClientActionMessage {
    const updateData: cf.legacy.app.UpdateData = {
      encodedAppState: state,
      appStateHash: ethers.constants.HashZero // TODO:
    };
    return {
      requestId: "1",
      appId: cfAddr,
      action: cf.legacy.node.ActionName.UPDATE,
      data: updateData,
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  public static validateMakeMove(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr,
    appState: string,
    moveNumber: number
  ) {
    const appA =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT]
        .appInstances[cfAddr];
    const appB =
      peerB.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT]
        .appInstances[cfAddr];

    expect(appA.encodedState).toEqual(appState);
    expect(appA.localNonce).toEqual(moveNumber + 1);
    expect(appB.encodedState).toEqual(appState);
    expect(appB.localNonce).toEqual(moveNumber + 1);
  }

  public static async uninstall(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr: string
  ) {
    const msg = TicTacToeSimulator.uninstallStartMsg(
      cfAddr,
      peerA.signingKey.address!,
      ethers.utils.bigNumberify(4),
      peerB.signingKey.address!,
      ethers.utils.bigNumberify(0)
    );
    const response = await peerA.runProtocol(msg);
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    // A wins so give him 2 and subtract 2 from B
    TicTacToeSimulator.validateUninstall(
      cfAddr,
      peerA,
      ethers.utils.bigNumberify(12),
      ethers.utils.bigNumberify(3)
    );
    await cf.legacy.utils.sleep(50);
    TicTacToeSimulator.validateUninstall(
      cfAddr,
      peerB,
      ethers.utils.bigNumberify(12),
      ethers.utils.bigNumberify(3)
    );
  }

  public static uninstallStartMsg(
    cfAddr: string,
    addressA: string,
    amountA: ethers.utils.BigNumber,
    addressB: string,
    amountB: ethers.utils.BigNumber
  ): cf.legacy.node.ClientActionMessage {
    const uninstallData = {
      peerAmounts: [
        new cf.legacy.utils.PeerBalance(addressA, amountA),
        new cf.legacy.utils.PeerBalance(addressB, amountB)
      ]
    };
    return {
      requestId: "2",
      appId: cfAddr,
      action: cf.legacy.node.ActionName.UNINSTALL,
      data: uninstallData,
      multisigAddress: UNUSED_FUNDED_ACCOUNT,
      fromAddress: addressA,
      toAddress: addressB,
      seq: 0
    };
  }

  public static validateUninstall(
    cfAddr: string,
    wallet: TestResponseSink,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    const channel =
      wallet.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    const app = channel.appInstances[cfAddr];
    expect(channel.freeBalance.aliceBalance).toEqual(amountA);
    expect(channel.freeBalance.bobBalance).toEqual(amountB);
    expect(channel.freeBalance.uniqueId).toEqual(0);
    expect(app.dependencyNonce.nonceValue).toEqual(1);
  }
}
