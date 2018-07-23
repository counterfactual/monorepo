import { TestWallet } from "./wallet/wallet";
import { ClientMessage, InstallData, PeerBalance } from "../src/types";
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
	let state = walletA.vm.cfState;

	let peerA = walletA.address;
	let peerB = walletB.address;
	if (peerB.localeCompare(peerA) < 0) {
		let tmp = peerA;
		peerA = peerB;
		peerB = tmp;
		let tmpAmmount = amountA;
		amountA = amountB;
		amountB = amountA;
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
	//await deposit(walletB, walletA, 5, 10);
}

/**
 * @param amountA is the amount wallet A wants to deposit into the channel.
 * @param amountBCumualtive is the amount wallet B already has in the channel.
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

async function installBalanceRefund(
	walletA: TestWallet,
	walletB: TestWallet,
	amount: number
) {
	let msg = startInstallBalanceRefundMsg(
		walletA.address,
		walletB.address,
		amount
	);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	return validateInstalledBalanceRefund(walletA, amount);
}

function startInstallBalanceRefundMsg(
	from: string,
	to: string,
	amount: number
): ClientMessage {
	let peerA = from;
	let peerB = to;
	let amountA = amount;
	let amountB = 0;
	if (peerB.localeCompare(peerA) < 0) {
		let tmp = peerA;
		peerB = peerA;
		peerA = tmp;
		amountA = 0;
		amountB = amount;
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
	validateNoAppsAndFreeBalance(walletA, walletB, amountA, amountB);
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
	// todo
}

function validateTtt(walletA: TestWallet, walletB: TestWallet) {
	// todo
}

function validateSystem(wallet: TestWallet) {
	// todo
}

async function validateBlockchain(): Promise<any> {
	// todo
}
