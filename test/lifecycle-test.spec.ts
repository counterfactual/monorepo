import { TestWallet } from "./wallet/wallet";
import {
	ClientMessage,
	InstallData,
	UpdateData,
	PeerBalance
} from "../src/types";
import { ResponseStatus } from "../src/vm";

const MULTISIG = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4";

describe("Lifecycle", async () => {
	it("should have the correct funds on chain", async () => {
		//given
		let walletA = new TestWallet("0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd0");
		let walletB = new TestWallet("0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd1");
		walletA.io.peer = walletB;
		walletB.io.peer = walletA;

		//when
		await setup(walletA, walletB);
		await makeDeposits(walletA, walletB);
		await playTtt(walletA, walletB);

		// then
		validateSystem(walletA);
		validateSystem(walletB);
		await gotoChain();
		await validateBlockchain();
	});
});

async function setup(walletA: TestWallet, walletB: TestWallet) {
	validatePresetup(walletA, walletB);
	let msg = setupStartMsg(walletA.address, walletB.address);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	validateSetup(walletA, walletB);
}

function validatePresetup(walletA: TestWallet, walletB: TestWallet) {
	expect(walletA.vm.cfState.channelStates).toEqual({});
	expect(walletB.vm.cfState.channelStates).toEqual({});
}

function setupStartMsg(from: string, to: string): ClientMessage {
	return {
		requestId: "0",
		appName: undefined,
		appId: undefined,
		action: "setup",
		data: {},
		multisigAddress: MULTISIG,
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0
	};
}

function validateSetup(walletA: TestWallet, walletB: TestWallet) {
	validateNoAppsAndFreeBalance(walletA, walletB, 0, 0);
	validateNoAppsAndFreeBalance(walletB, walletA, 0, 0);
}

/**
 * Validates the correctness of walletA's free balance *not* walletB's.
 */
function validateNoAppsAndFreeBalance(
	walletA: TestWallet,
	walletB: TestWallet,
	amountA: number,
	amountB: number
) {
	// todo: add nonce and uniqueId params and check them
	let state = walletA.vm.cfState;

	let peerA = walletA.address;
	let peerB = walletB.address;
	if (peerB.localeCompare(peerA) < 0) {
		let tmp = peerA;
		peerA = peerB;
		peerB = tmp;
		let tmpAmount = amountA;
		amountA = amountB;
		amountB = tmpAmount;
	}

	let channel = walletA.vm.cfState.channelStates[MULTISIG];
	expect(Object.keys(state.channelStates).length).toBe(1);
	expect(channel.toAddress).toBe(walletB.address);
	expect(channel.fromAddress).toBe(walletA.address);
	expect(channel.multisigAddress).toBe(MULTISIG);
	expect(channel.appChannels).toEqual({});
	expect(channel.freeBalance.peerA.address).toBe(peerA);
	expect(channel.freeBalance.peerB.address).toBe(peerB);
	expect(channel.freeBalance.peerA.balance).toBe(amountA);
	expect(channel.freeBalance.peerB.balance).toBe(amountB);
}

async function makeDeposits(
	walletA: TestWallet,
	walletB: TestWallet
): Promise<any> {
	await deposit(walletA, walletB, 10, 0);
	await deposit(walletB, walletA, 5, 10);
}

/**
 * @param amountA is the amount wallet A wants to deposit into the channel.
 * @param amountBCumualtive is the amount wallet B already has in the channel,
 *        i.e., the threshold for the balance refund.
 */
async function deposit(
	walletA: TestWallet,
	walletB: TestWallet,
	amountA: number,
	amountBCumlative: number
) {
	let cfAddr = await installBalanceRefund(walletA, walletB, amountBCumlative);
	await depositOnChain(walletA, amountA);
	await uninstallBalanceRefund(
		cfAddr,
		walletA,
		walletB,
		amountA,
		amountBCumlative
	);
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function installBalanceRefund(
	walletA: TestWallet,
	walletB: TestWallet,
	threshold: number
) {
	let msg = startInstallBalanceRefundMsg(
		walletA.address,
		walletB.address,
		threshold
	);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	// since the machine is async, we need to wait for walletB to finish up its
	// side of the protocol before inspecting it's state
	await sleep(100);
	// check B's client
	validateInstalledBalanceRefund(walletB, threshold);
	// check A's client and return the newly created cf address
	return validateInstalledBalanceRefund(walletA, threshold);
}

function startInstallBalanceRefundMsg(
	from: string,
	to: string,
	threshold: number
): ClientMessage {
	let peerA = from;
	let peerB = to;
	if (peerB.localeCompare(peerA) < 0) {
		let tmp = peerA;
		peerA = peerB;
		peerB = tmp;
	}
	let installData: InstallData = {
		peerA: new PeerBalance(peerA, 0),
		peerB: new PeerBalance(peerB, 0),
		keyA: null,
		keyB: null,
		encodedAppState: "0x1234"
	};
	return {
		requestId: "1",
		appName: "balanceRefund",
		appId: undefined,
		action: "install",
		data: installData,
		multisigAddress: MULTISIG,
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0
	};
}

function validateInstalledBalanceRefund(wallet: TestWallet, amount: number) {
	let stateChannel = wallet.vm.cfState.channelStates[MULTISIG];
	let appChannels = stateChannel.appChannels;
	let cfAddrs = Object.keys(appChannels);
	expect(cfAddrs.length).toBe(1);

	let cfAddr = cfAddrs[0];

	expect(appChannels[cfAddr].peerA.balance).toBe(0);
	expect(appChannels[cfAddr].peerA.address).toBe(
		stateChannel.freeBalance.peerA.address
	);
	expect(appChannels[cfAddr].peerA.balance).toBe(0);

	expect(appChannels[cfAddr].peerB.balance).toBe(0);
	expect(appChannels[cfAddr].peerB.address).toBe(
		stateChannel.freeBalance.peerB.address
	);
	expect(appChannels[cfAddr].peerB.balance).toBe(0);

	return cfAddr;
}

async function depositOnChain(wallet: TestWallet, amount: number) {
	// todo
}

async function uninstallBalanceRefund(
	cfAddr: string,
	walletA: TestWallet,
	walletB: TestWallet,
	amountA: number,
	amountB: number
) {
	let msg = startUninstallBalanceRefundMsg(
		cfAddr,
		walletA.address,
		walletB.address,
		amountA
	);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	// validate walletA
	validateNoAppsAndFreeBalance(walletA, walletB, amountA, amountB);
	// validate walletB
	validateNoAppsAndFreeBalance(walletB, walletA, amountB, amountA);
}

function startUninstallBalanceRefundMsg(
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
		appName: "balanceRefund",
		appId: appId,
		action: "uninstall",
		data: uninstallData,
		multisigAddress: MULTISIG,
		fromAddress: from,
		toAddress: to,
		stateChannel: undefined,
		seq: 0
	};
}

async function playTtt(walletA: TestWallet, walletB: TestWallet) {
	let cfAddr = await installTtt(walletA, walletB);
	await makeMoves(walletA, walletB, cfAddr);
	await uninstallTtt(walletA, walletB, cfAddr);
}

async function installTtt(walletA: TestWallet, walletB: TestWallet) {
	let msg = installTttMsg(walletA.address, walletB.address);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	return await validateInstallTtt(walletA, walletB);
}

function installTttMsg(to: string, from: string): ClientMessage {
	let peerA = from;
	let peerB = to;
	if (peerB.localeCompare(peerA) < 0) {
		let tmp = peerA;
		peerA = peerB;
		peerB = tmp;
	}
	let installData: InstallData = {
		peerA: new PeerBalance(peerA, 2),
		peerB: new PeerBalance(peerB, 2),
		keyA: null,
		keyB: null,
		encodedAppState: "0x1234"
	};
	return {
		requestId: "5",
		appName: "ttt",
		appId: undefined,
		action: "install",
		data: installData,
		multisigAddress: MULTISIG,
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0
	};
}

async function validateInstallTtt(
	walletA: TestWallet,
	walletB: TestWallet
): string {
	validateInstallTttWallet(walletA, walletB);
	// wait for other client to finish, since the machine is async
	await sleep(100);
	return validateInstallTttWallet(walletB, walletA);
}

function validateInstallTttWallet(walletA: TestWallet, walletB: TestWallet) {
	let stateChannel = walletA.vm.cfState.channelStates[MULTISIG];
	let appChannels = stateChannel.appChannels;
	let cfAddrs = Object.keys(appChannels);
	expect(cfAddrs.length).toBe(1);

	// first validate the app
	let cfAddr = cfAddrs[0];
	expect(appChannels[cfAddr].peerA.balance).toBe(2);
	expect(appChannels[cfAddr].peerB.balance).toBe(2);

	// now validate the free balance
	let channel = walletA.vm.cfState.channelStates[MULTISIG];
	// start with 10, 5 and both parties deposit 2 into TTT.
	expect(channel.freeBalance.peerA.balance).toBe(8);
	expect(channel.freeBalance.peerB.balance).toBe(3);
	return cfAddr;
}

/**
 * Game is over at the end of this functon call and is ready to be uninstalled.
 */
async function makeMoves(
	walletA: TestWallet,
	walletB: TestWallet,
	cfAddr: string
) {
	let state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	const X = 1;
	const O = 2;

	await makeMove(walletA, walletB, cfAddr, state, 0, X);
	await makeMove(walletB, walletA, cfAddr, state, 4, O);
	await makeMove(walletA, walletB, cfAddr, state, 1, X);
	await makeMove(walletB, walletA, cfAddr, state, 5, O);
	await makeMove(walletA, walletB, cfAddr, state, 2, X);
}

async function makeMove(
	walletA: TestWallet,
	walletB: TestWallet,
	cfAddr: string,
	appState: Array<number>,
	cell: number,
	side: number
) {
	appState[cell] = side;
	let state = appState + ""; // todo: this should be encodedc
	let msg = updateTttMsg(state, cell, walletA.address, walletB.address, cfAddr);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	validateMakeMove(walletA, walletB, cfAddr, state);
	await sleep(100);
	validateMakeMove(walletB, walletA, cfAddr, state);
}

function updateTttMsg(
	state: string,
	cell: number,
	to: string,
	from: string,
	cfAddr: string
): ClientMsg {
	let updateData: UpdateData = {
		encodedAppState: state
	};
	return {
		requestId: "1",
		appName: "ttt",
		appId: cfAddr,
		action: "update",
		data: updateData,
		multisigAddress: MULTISIG,
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0
	};
}

function validateMakeMove(
	walletA: TestWallet,
	walletB: TestWallet,
	cfAddr,
	appState: string
) {
	console.log(walletA.vm.cfState.channelStates[MULTISIG].appChannels[cfAddr]);
	console.log(walletB.vm.cfState.channelStates[MULTISIG].appChannels[cfAddr]);
}

async function uninstallTtt(
	walletA: TestWallet,
	walletB: TestWallet,
	cfAddr: string
) {
	// todo
}

function validateTtt(walletA: TestWallet, walletB: TestWallet) {
	// todo
}

function validateSystem(wallet: TestWallet) {
	// todo
}

async function gotoChain() {
	// todo
}

async function validateBlockchain(): Promise<any> {
	// todo
}

export async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
