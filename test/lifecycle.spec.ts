import { TestWallet } from "./wallet/wallet";
import {
	ClientMessage,
	InstallData,
	UpdateData,
	PeerBalance,
	ActionName
} from "../src/types";
import {
	Terms,
	CfAppInterface,
	zeroAddress,
	zeroBytes32
} from "../src/middleware/cf-operation/types";
import { ResponseStatus } from "../src/vm";
import { sleep, SetupProtocol } from "./common";
import { MULTISIG_ADDRESS, A_PRIVATE_KEY, B_PRIVATE_KEY } from "./constants";

/**
 * Tests that the machine's CfState is correctly modified during the lifecycle
 * of a state channel application, TTT, running the setup, install, update,
 * and uninstall protocols.
 */
describe("Machine State Lifecycle", async function() {
	// extending the timeout to allow the async machines to finish
	jest.setTimeout(30000);

	it("should modify machine state during the lifecycle of TTT", async () => {
		let [walletA, walletB] = wallets();
		await SetupProtocol.run(walletA, walletB);
		await Depositor.makeDeposits(walletA, walletB);
		await Ttt.play(walletA, walletB);
	});
});

/**
 * @returns the wallets containing the machines that will be used for the test.
 */
function wallets(): [TestWallet, TestWallet] {
	let walletA = new TestWallet(A_PRIVATE_KEY);
	let walletB = new TestWallet(B_PRIVATE_KEY);
	walletA.io.peer = walletB;
	walletB.io.peer = walletA;
	return [walletA, walletB];
}

/**
 * A collection of staic methods responsible for "depositing", i.e., running
 * the intsall protocol with  "balance refund/withdraw" app, and ensuring
 * the machine state was correctly modified.
 */
class Depositor {
	static async makeDeposits(
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
	static async deposit(
		walletA: TestWallet,
		walletB: TestWallet,
		amountA: number,
		amountBCumlative: number
	) {
		let cfAddr = await Depositor.installBalanceRefund(
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

	static async installBalanceRefund(
		walletA: TestWallet,
		walletB: TestWallet,
		threshold: number
	) {
		let msg = Depositor.startInstallBalanceRefundMsg(
			walletA.address,
			walletB.address,
			threshold
		);
		let response = await walletA.runProtocol(msg);
		expect(response.status).toEqual(ResponseStatus.COMPLETED);
		// since the machine is async, we need to wait for walletB to finish up its
		// side of the protocol before inspecting it's state
		await sleep(50);
		// check B's client
		Depositor.validateInstalledBalanceRefund(walletB, walletA, threshold);
		// check A's client and return the newly created cf address
		return Depositor.validateInstalledBalanceRefund(
			walletA,
			walletB,
			threshold
		);
	}

	static startInstallBalanceRefundMsg(
		to: string,
		from: string,
		threshold: number
	): ClientMessage {
		let canon = PeerBalance.balances(from, 0, to, 0);
		let terms = new Terms(0, 10, zeroAddress); // todo
		let app = new CfAppInterface(
			"0x0",
			"0x11111111",
			"0x11111111",
			"0x11111111",
			"0x11111111"
		); // todo
		let timeout = 100;
		let installData: InstallData = {
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

	static validateInstalledBalanceRefund(
		walletA: TestWallet,
		walletB: TestWallet,
		amount: number
	) {
		let stateChannel = walletA.vm.cfState.channelStates[MULTISIG_ADDRESS];
		expect(stateChannel.me).toEqual(walletA.address);
		expect(stateChannel.counterParty).toEqual(walletB.address);

		let appChannels = stateChannel.appChannels;
		let cfAddrs = Object.keys(appChannels);
		expect(cfAddrs.length).toEqual(1);

		let cfAddr = cfAddrs[0];
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

	static async uninstallBalanceRefund(
		cfAddr: string,
		walletA: TestWallet,
		walletB: TestWallet,
		amountA: number,
		amountB: number
	) {
		let msg = Depositor.startUninstallBalanceRefundMsg(
			cfAddr,
			walletA.address,
			walletB.address,
			amountA
		);
		let response = await walletA.runProtocol(msg);
		expect(response.status).toEqual(ResponseStatus.COMPLETED);
		// validate walletA
		Depositor.validateUninstall(cfAddr, walletA, walletB, amountA, amountB);
		// validate walletB
		Depositor.validateUninstall(cfAddr, walletB, walletA, amountB, amountA);
	}

	static validateUninstall(
		cfAddr: string,
		walletA: TestWallet,
		walletB: TestWallet,
		amountA: number,
		amountB: number
	) {
		// todo: add nonce and uniqueId params and check them
		let state = walletA.vm.cfState;
		let canon = PeerBalance.balances(
			walletA.address,
			amountA,
			walletB.address,
			amountB
		);

		let channel = walletA.vm.cfState.channelStates[MULTISIG_ADDRESS];
		let app = channel.appChannels[cfAddr];

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

	static startUninstallBalanceRefundMsg(
		appId: string,
		from: string,
		to: string,
		amount: number
	): ClientMessage {
		let uninstallData = {
			peerAmounts: [new PeerBalance(from, amount), new PeerBalance(to, 0)]
		};
		return {
			requestId: "2",
			appId: appId,
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
	static async play(walletA: TestWallet, walletB: TestWallet) {
		let cfAddr = await Ttt.installTtt(walletA, walletB);
		await Ttt.makeMoves(walletA, walletB, cfAddr);
		await Ttt.uninstall(walletA, walletB, cfAddr);
		return cfAddr;
	}

	static async installTtt(walletA: TestWallet, walletB: TestWallet) {
		let msg = Ttt.installMsg(walletA.address, walletB.address);
		let response = await walletA.runProtocol(msg);
		expect(response.status).toEqual(ResponseStatus.COMPLETED);
		return await Ttt.validateInstall(walletA, walletB);
	}

	static installMsg(to: string, from: string): ClientMessage {
		let peerA = from;
		let peerB = to;
		if (peerB.localeCompare(peerA) < 0) {
			let tmp = peerA;
			peerA = peerB;
			peerB = tmp;
		}
		let terms = new Terms(0, 10, zeroAddress); // todo
		let app = new CfAppInterface(
			"0x0",
			"0x11111111",
			"0x11111111",
			"0x11111111",
			"0x11111111"
		); // todo
		let timeout = 100;
		let installData: InstallData = {
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

	static async validateInstall(
		walletA: TestWallet,
		walletB: TestWallet
	): Promise<string> {
		Ttt.validateInstallWallet(walletA, walletB);
		// wait for other client to finish, since the machine is async
		await sleep(50);
		return Ttt.validateInstallWallet(walletB, walletA);
	}

	static validateInstallWallet(walletA: TestWallet, walletB: TestWallet) : string {
		let stateChannel = walletA.vm.cfState.channelStates[MULTISIG_ADDRESS];
		let appChannels = stateChannel.appChannels;
		console.log("getting app channels");
		console.log(appChannels);
		let cfAddrs = Object.keys(appChannels);
		expect(cfAddrs.length).toEqual(1);

		// first validate the app
		let cfAddr = cfAddrs[0];
		expect(appChannels[cfAddr].peerA.balance).toEqual(2);
		expect(appChannels[cfAddr].peerB.balance).toEqual(2);

		// now validate the free balance
		let channel = walletA.vm.cfState.channelStates[MULTISIG_ADDRESS];
		// start with 10, 5 and both parties deposit 2 into TTT.
		expect(channel.freeBalance.aliceBalance).toEqual(8);
		expect(channel.freeBalance.bobBalance).toEqual(3);
		return cfAddr;
	}

	/**
	 * Game is over at the end of this functon call and is ready to be uninstalled.
	 */
	static async makeMoves(
		walletA: TestWallet,
		walletB: TestWallet,
		cfAddr: string
	) {
		let state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
		const X = 1;
		const O = 2;

		await Ttt.makeMove(walletA, walletB, cfAddr, state, 0, X, 1);
		await Ttt.makeMove(walletB, walletA, cfAddr, state, 4, O, 2);
		await Ttt.makeMove(walletA, walletB, cfAddr, state, 1, X, 3);
		await Ttt.makeMove(walletB, walletA, cfAddr, state, 5, O, 4);
		await Ttt.makeMove(walletA, walletB, cfAddr, state, 2, X, 5);
	}

	static async makeMove(
		walletA: TestWallet,
		walletB: TestWallet,
		cfAddr: string,
		appState: Array<number>,
		cell: number,
		side: number,
		moveNumber: number
	) {
		appState[cell] = side;
		let state = appState + ""; // todo: this should be encodedc
		let msg = Ttt.updateMsg(
			state,
			cell,
			walletA.address,
			walletB.address,
			cfAddr
		);
		let response = await walletA.runProtocol(msg);
		expect(response.status).toEqual(ResponseStatus.COMPLETED);
		Ttt.validateMakeMove(walletA, walletB, cfAddr, state, moveNumber);
		await sleep(50);
		Ttt.validateMakeMove(walletB, walletA, cfAddr, state, moveNumber);
	}

	static updateMsg(
		state: string,
		cell: number,
		to: string,
		from: string,
		cfAddr: string
	): ClientMessage {
		let updateData: UpdateData = {
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

	static validateMakeMove(
		walletA: TestWallet,
		walletB: TestWallet,
		cfAddr,
		appState: string,
		moveNumber: number
	) {
		let appA =
			walletA.vm.cfState.channelStates[MULTISIG_ADDRESS].appChannels[cfAddr];
		let appB =
			walletB.vm.cfState.channelStates[MULTISIG_ADDRESS].appChannels[cfAddr];

		expect(appA.encodedState).toEqual(appState);
		expect(appA.localNonce).toEqual(moveNumber + 1);
		expect(appB.encodedState).toEqual(appState);
		expect(appB.localNonce).toEqual(moveNumber + 1);
	}

	static async uninstall(
		walletA: TestWallet,
		walletB: TestWallet,
		cfAddr: string
	) {
		let msg = Ttt.uninstallStartMsg(
			cfAddr,
			walletA.address,
			4,
			walletB.address,
			0
		);
		let response = await walletA.runProtocol(msg);
		expect(response.status).toEqual(ResponseStatus.COMPLETED);
		// A wins so give him 2 and subtract 2 from B
		Ttt.validateUninstall(cfAddr, walletA, 12, 3);
		await sleep(50);
		Ttt.validateUninstall(cfAddr, walletB, 12, 3);
	}

	static uninstallStartMsg(
		cfAddr: string,
		addressA: string,
		amountA: number,
		addressB: string,
		amountB: number
	): ClientMessage {
		let uninstallData = {
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

	static validateUninstall(
		cfAddr: string,
		wallet: TestWallet,
		amountA: number,
		amountB: number
	) {
		let channel = wallet.vm.cfState.channelStates[MULTISIG_ADDRESS];
		let app = channel.appChannels[cfAddr];
		expect(channel.freeBalance.aliceBalance).toEqual(amountA);
		expect(channel.freeBalance.bobBalance).toEqual(amountB);
		expect(channel.freeBalance.uniqueId).toEqual(0);
		expect(app.dependencyNonce.nonce).toEqual(2);
	}
}
