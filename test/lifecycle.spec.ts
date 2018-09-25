import {
  CfAppInterface,
  Terms,
  zeroAddress,
  zeroBytes32
} from "../src/middleware/cf-operation/types";
import {
  ActionName,
  ClientActionMessage,
  InstallData,
  PeerBalance,
  UpdateData
} from "../src/types";
import { ResponseStatus } from "../src/vm";
import { SetupProtocol, sleep } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  MULTISIG_ADDRESS
} from "./environment";
import { TestWallet } from "./wallet/wallet";

/**
 * Tests that the machine's CfState is correctly modified during the lifecycle
 * of a state channel application, TTT, running the setup, install, update,
 * and uninstall protocols.
 */
describe("Machine State Lifecycle", async function() {
  // extending the timeout to allow the async machines to finish
  jest.setTimeout(30000);

  it("should modify machine state during the lifecycle of TTT", async () => {
    const [walletA, walletB]: TestWallet[] = getWallets();
    await SetupProtocol.run(walletA, walletB);
    await Depositor.makeDeposits(walletA, walletB);
    await Ttt.play(walletA, walletB);
  });
});

/**
 * @returns the wallets containing the machines that will be used for the test.
 */
function getWallets(): TestWallet[] {
  const walletA = new TestWallet();
  walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);

  const walletB = new TestWallet();
  walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

  walletA.currentUser.io.peer = walletB;
  walletB.currentUser.io.peer = walletA;
  return [walletA, walletB];
}

/**
 * A collection of staic methods responsible for "depositing", i.e., running
 * the intsall protocol with  "balance refund/withdraw" app, and ensuring
 * the machine state was correctly modified.
 */
class Depositor {
  public static async makeDeposits(
    walletA: TestWallet,
    walletB: TestWallet
  ): Promise<any> {
    await Depositor.deposit(walletA, walletB, 10, 0);
    await Depositor.deposit(walletB, walletA, 5, 10);
  }

  /**
   * @param amountA is the amount wallet A wants to deposit into the channel.
   * @param amountBCumualtive is the amount wallet B already has in the channel,
   *        i.e., the threshold for the balance refund.
   */
  public static async deposit(
    walletA: TestWallet,
    walletB: TestWallet,
    amountA: number,
    amountBCumlative: number
  ) {
    const cfAddr = await Depositor.installBalanceRefund(
      walletA,
      walletB,
      amountBCumlative
    );
    await Depositor.uninstallBalanceRefund(
      cfAddr,
      walletA,
      walletB,
      amountA,
      amountBCumlative
    );
  }

  public static async installBalanceRefund(
    walletA: TestWallet,
    walletB: TestWallet,
    threshold: number
  ) {
    const msg = Depositor.startInstallBalanceRefundMsg(
      walletA.address,
      walletB.address,
      threshold
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
    // since the machine is async, we need to wait for walletB to finish up its
    // side of the protocol before inspecting it's state
    await sleep(50);
    // check B's client
    Depositor.validateInstalledBalanceRefund(walletA, walletB, threshold);
    // check A's client and return the newly created cf address
    return Depositor.validateInstalledBalanceRefund(
      walletA,
      walletB,
      threshold
    );
  }

  public static startInstallBalanceRefundMsg(
    from: string,
    to: string,
    threshold: number
  ): ClientActionMessage {
    const canon = PeerBalance.balances(from, 0, to, 0);
    const terms = new Terms(0, 10, zeroAddress); // todo
    const app = new CfAppInterface(
      "0x0",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      ""
    ); // todo
    const timeout = 100;
    const installData: InstallData = {
      peerA: canon.peerA,
      peerB: canon.peerB,
      keyA: "",
      keyB: "",
      encodedAppState: "0x1234",
      terms,
      app,
      timeout
    };
    return {
      requestId: "1",
      appId: "",
      action: ActionName.INSTALL,
      data: installData,
      multisigAddress: MULTISIG_ADDRESS,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  public static validateInstalledBalanceRefund(
    walletA: TestWallet,
    walletB: TestWallet,
    amount: number
  ) {
    const stateChannel =
      walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
    expect(stateChannel.me).toEqual(walletA.address);
    expect(stateChannel.counterParty).toEqual(walletB.address);

    const appChannels = stateChannel.appChannels;
    const cfAddrs = Object.keys(appChannels);
    expect(cfAddrs.length).toEqual(1);

    const cfAddr = cfAddrs[0];
    expect(appChannels[cfAddr].peerA.balance).toEqual(0);
    expect(appChannels[cfAddr].peerA.address).toEqual(
      stateChannel.freeBalance.alice
    );
    expect(appChannels[cfAddr].peerA.balance).toEqual(0);
    expect(appChannels[cfAddr].peerB.balance).toEqual(0);
    expect(appChannels[cfAddr].peerB.address).toEqual(
      stateChannel.freeBalance.bob
    );
    expect(appChannels[cfAddr].peerB.balance).toEqual(0);

    return cfAddr;
  }

  public static async uninstallBalanceRefund(
    cfAddr: string,
    walletA: TestWallet,
    walletB: TestWallet,
    amountA: number,
    amountB: number
  ) {
    const msg = Depositor.startUninstallBalanceRefundMsg(
      cfAddr,
      walletA.address,
      walletB.address,
      amountA
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
    // validate walletA
    Depositor.validateUninstall(cfAddr, walletA, walletB, amountA, amountB);
    // validate walletB
    Depositor.validateUninstall(cfAddr, walletB, walletA, amountB, amountA);
  }

  public static validateUninstall(
    cfAddr: string,
    walletA: TestWallet,
    walletB: TestWallet,
    amountA: number,
    amountB: number
  ) {
    // todo: add nonce and uniqueId params and check them
    const state = walletA.currentUser.vm.cfState;
    const canon = PeerBalance.balances(
      walletA.address,
      amountA,
      walletB.address,
      amountB
    );

    const channel =
      walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
    const app = channel.appChannels[cfAddr];

    expect(Object.keys(state.channelStates).length).toEqual(1);
    expect(channel.me).toEqual(walletA.address);
    expect(channel.counterParty).toEqual(walletB.address);
    expect(channel.multisigAddress).toEqual(MULTISIG_ADDRESS);
    expect(channel.freeBalance.alice).toEqual(canon.peerA.address);
    expect(channel.freeBalance.bob).toEqual(canon.peerB.address);
    expect(channel.freeBalance.aliceBalance).toEqual(canon.peerA.balance);
    expect(channel.freeBalance.bobBalance).toEqual(canon.peerB.balance);
    expect(channel.freeBalance.uniqueId).toEqual(0);
    expect(app.dependencyNonce.nonce).toEqual(2);
  }

  public static startUninstallBalanceRefundMsg(
    appId: string,
    from: string,
    to: string,
    amount: number
  ): ClientActionMessage {
    const uninstallData = {
      peerAmounts: [new PeerBalance(from, amount), new PeerBalance(to, 0)]
    };
    return {
      requestId: "2",
      appId,
      action: ActionName.UNINSTALL,
      data: uninstallData,
      multisigAddress: MULTISIG_ADDRESS,
      fromAddress: from,
      toAddress: to,
      seq: 0
    };
  }
}

class Ttt {
  public static async play(walletA: TestWallet, walletB: TestWallet) {
    const cfAddr = await Ttt.installTtt(walletA, walletB);
    await Ttt.makeMoves(walletA, walletB, cfAddr);
    await Ttt.uninstall(walletA, walletB, cfAddr);
    return cfAddr;
  }

  public static async installTtt(walletA: TestWallet, walletB: TestWallet) {
    const msg = Ttt.installMsg(walletA.address, walletB.address);
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
    return Ttt.validateInstall(walletA, walletB);
  }

  public static installMsg(to: string, from: string): ClientActionMessage {
    let peerA = from;
    let peerB = to;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
    const terms = new Terms(0, 10, zeroAddress); // todo
    const app = new CfAppInterface(
      "0x0",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      ""
    ); // todo
    const timeout = 100;
    const installData: InstallData = {
      peerA: new PeerBalance(peerA, 2),
      peerB: new PeerBalance(peerB, 2),
      keyA: "",
      keyB: "",
      encodedAppState: "0x1234",
      terms,
      app,
      timeout
    };
    return {
      requestId: "5",
      appId: "",
      action: ActionName.INSTALL,
      data: installData,
      multisigAddress: MULTISIG_ADDRESS,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  public static async validateInstall(
    walletA: TestWallet,
    walletB: TestWallet
  ): Promise<string> {
    Ttt.validateInstallWallet(walletA, walletB);
    // wait for other client to finish, since the machine is async
    await sleep(50);
    return Ttt.validateInstallWallet(walletB, walletA);
  }

  public static validateInstallWallet(
    walletA: TestWallet,
    walletB: TestWallet
  ): string {
    const stateChannel =
      walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
    const appChannels = stateChannel.appChannels;
    const cfAddrs = Object.keys(appChannels);
    expect(cfAddrs.length).toEqual(1);

    // first validate the app
    const cfAddr = cfAddrs[0];
    expect(appChannels[cfAddr].peerA.balance).toEqual(2);
    expect(appChannels[cfAddr].peerB.balance).toEqual(2);

    // now validate the free balance
    const channel =
      walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
    // start with 10, 5 and both parties deposit 2 into TTT.
    expect(channel.freeBalance.aliceBalance).toEqual(8);
    expect(channel.freeBalance.bobBalance).toEqual(3);
    return cfAddr;
  }

  /**
   * Game is over at the end of this functon call and is ready to be uninstalled.
   */
  public static async makeMoves(
    walletA: TestWallet,
    walletB: TestWallet,
    cfAddr: string
  ) {
    const state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const X = 1;
    const O = 2;

    await Ttt.makeMove(walletA, walletB, cfAddr, state, 0, X, 1);
    await Ttt.makeMove(walletB, walletA, cfAddr, state, 4, O, 2);
    await Ttt.makeMove(walletA, walletB, cfAddr, state, 1, X, 3);
    await Ttt.makeMove(walletB, walletA, cfAddr, state, 5, O, 4);
    await Ttt.makeMove(walletA, walletB, cfAddr, state, 2, X, 5);
  }

  public static async makeMove(
    walletA: TestWallet,
    walletB: TestWallet,
    cfAddr: string,
    appState: number[],
    cell: number,
    side: number,
    moveNumber: number
  ) {
    appState[cell] = side;
    const state = appState + ""; // todo: this should be encodedc
    const msg = Ttt.updateMsg(
      state,
      cell,
      walletA.address,
      walletB.address,
      cfAddr
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
    Ttt.validateMakeMove(walletA, walletB, cfAddr, state, moveNumber);
    await sleep(50);
    Ttt.validateMakeMove(walletB, walletA, cfAddr, state, moveNumber);
  }

  public static updateMsg(
    state: string,
    cell: number,
    to: string,
    from: string,
    cfAddr: string
  ): ClientActionMessage {
    const updateData: UpdateData = {
      encodedAppState: state,
      appStateHash: zeroBytes32 // todo
    };
    return {
      requestId: "1",
      appId: cfAddr,
      action: ActionName.UPDATE,
      data: updateData,
      multisigAddress: MULTISIG_ADDRESS,
      toAddress: to,
      fromAddress: from,
      seq: 0
    };
  }

  public static validateMakeMove(
    walletA: TestWallet,
    walletB: TestWallet,
    cfAddr,
    appState: string,
    moveNumber: number
  ) {
    const appA =
      walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS]
        .appChannels[cfAddr];
    const appB =
      walletB.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS]
        .appChannels[cfAddr];

    expect(appA.encodedState).toEqual(appState);
    expect(appA.localNonce).toEqual(moveNumber + 1);
    expect(appB.encodedState).toEqual(appState);
    expect(appB.localNonce).toEqual(moveNumber + 1);
  }

  public static async uninstall(
    walletA: TestWallet,
    walletB: TestWallet,
    cfAddr: string
  ) {
    const msg = Ttt.uninstallStartMsg(
      cfAddr,
      walletA.address,
      4,
      walletB.address,
      0
    );
    const response = await walletA.runProtocol(msg);
    expect(response.status).toEqual(ResponseStatus.COMPLETED);
    // A wins so give him 2 and subtract 2 from B
    Ttt.validateUninstall(cfAddr, walletA, 12, 3);
    await sleep(50);
    Ttt.validateUninstall(cfAddr, walletB, 12, 3);
  }

  public static uninstallStartMsg(
    cfAddr: string,
    addressA: string,
    amountA: number,
    addressB: string,
    amountB: number
  ): ClientActionMessage {
    const uninstallData = {
      peerAmounts: [
        new PeerBalance(addressA, amountA),
        new PeerBalance(addressB, amountB)
      ]
    };
    return {
      requestId: "2",
      appId: cfAddr,
      action: ActionName.UNINSTALL,
      data: uninstallData,
      multisigAddress: MULTISIG_ADDRESS,
      fromAddress: addressA,
      toAddress: addressB,
      seq: 0
    };
  }

  public static validateUninstall(
    cfAddr: string,
    wallet: TestWallet,
    amountA: number,
    amountB: number
  ) {
    const channel =
      wallet.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
    const app = channel.appChannels[cfAddr];
    expect(channel.freeBalance.aliceBalance).toEqual(amountA);
    expect(channel.freeBalance.bobBalance).toEqual(amountB);
    expect(channel.freeBalance.uniqueId).toEqual(0);
    expect(app.dependencyNonce.nonce).toEqual(2);
  }
}
