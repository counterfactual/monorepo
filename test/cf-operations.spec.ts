import * as _ from "lodash";

import { TestWallet } from "./wallet/wallet";
import {
	ActionName,
	ClientMessage,
	InstallData,
	NetworkContext,
	PeerBalance,
	UpdateData
} from "../src/types";
import {
	CfAppInterface,
	CfFreeBalance,
	CfStateChannel,
	Terms,
	zeroAddress,
	zeroBytes32
} from "../src/middleware/cf-operation/types";
import * as ethers from "ethers";
import { ResponseStatus } from "../src/vm";
import {
	A_PRIVATE_KEY,
	B_PRIVATE_KEY,
	MULTISIG_ADDRESS,
	MULTISIG_PRIVATE_KEY
} from "./constants";
import { HIGH_GAS_LIMIT } from "@counterfactual/test-utils";

export async function mineOneBlock(provider: ethers.providers.JsonRpcProvider) {
	return provider.send("evm_mine", []);
}

export async function mineBlocks(
	num: number,
	provider: ethers.providers.JsonRpcProvider
) {
	for (let i = 0; i < num; i++) {
		await mineOneBlock(provider);
	}
}

describe("Setup Protocol", async function() {
	jest.setTimeout(30000);
	//console.log = () => {};

	it("should have the correct funds on chain", async () => {
		const networkFile = require("/app/contracts/networks/7777777.json");

		const networkFileAsMap = _.mapValues(
			_.keyBy(networkFile.contracts, "contractName"),
			"address"
		);

		const networkContext = new NetworkContext(
			networkFileAsMap["Registry"],
			networkFileAsMap["PaymentApp"],
			networkFileAsMap["ConditionalTransfer"],
			networkFileAsMap["MultiSend"],
			networkFileAsMap["NonceRegistry"],
			networkFileAsMap["Signatures"],
			networkFileAsMap["StaticCall"]
		);

		let walletA = new TestWallet(
			A_PRIVATE_KEY,
			undefined,
			undefined,
			networkContext
		);
		let walletB = new TestWallet(
			B_PRIVATE_KEY,
			undefined,
			undefined,
			networkContext
		);

		let startBalanceA = await walletA.wallet.getBalance();
		let startBalanceB = await walletB.wallet.getBalance();

		let masterWallet = new TestWallet(
			MULTISIG_PRIVATE_KEY,
			undefined,
			undefined,
			networkContext
		);

		walletA.io.peer = walletB;
		walletB.io.peer = walletA;

		// STEP 1 -- DEPLOY MULTISIG :)

		const Registry = require("/app/contracts/build/contracts/Registry.json");
		const registry = await new ethers.Contract(
			networkContext.Registry,
			Registry.abi,
			masterWallet.wallet
		);

		// TODO: Truffle migrate does not auto-link the bytecode in the build folder,
		//       so we have to do it manually. Will fix later of course :)
		// TODO: Also don't require a docker-specific path.
		const Multisig = require("/app/contracts/build/contracts/MinimumViableMultisig.json");
		Multisig.bytecode = Multisig.bytecode.replace(
			/__Signatures_+/g,
			networkFileAsMap["Signatures"].substr(2)
		);
		const multisig = await new ethers.Contract(
			"",
			Multisig.abi,
			masterWallet.wallet
		).deploy(Multisig.bytecode);
		console.error(`DEPLOYED MULTISIG AT ${multisig.address}`);

		// STEP 2 -- GENERATE COMMITMENTS
		await setup(multisig.address, walletA, walletB);

		// STEP 3 -- FUND THE MULTISIG
		const balanceRefundAppId = await makeDeposits(
			multisig.address,
			walletA,
			walletB
		);

		// STEP 4 -- DEPLOY SIGNED COMMITMENT FOR FREE BALANCE
		// Attempt 1 --> walletA.goToChain()
		// Attempt 2 --> walletA.vm.cfState.freeBalance(multisig.address).

		const StateChannel = require("/app/contracts/build/contracts/StateChannel.json");
		StateChannel.bytecode = StateChannel.bytecode.replace(
			/__Signatures_+/g,
			networkFileAsMap["Signatures"].substr(2)
		);
		StateChannel.bytecode = StateChannel.bytecode.replace(
			/__StaticCall_+/g,
			networkFileAsMap["StaticCall"].substr(2)
		);

		let canon = PeerBalance.balances(walletA.address, 0, walletB.address, 0);

		const signingKeys = [canon.peerA.address, canon.peerB.address];
		const app = CfFreeBalance.contractInterface(networkContext);
		const terms = CfFreeBalance.terms();
		const initcode = new ethers.Interface(
			StateChannel.abi
		).deployFunction.encode(StateChannel.bytecode, [
			multisig.address,
			signingKeys,
			app.hash(),
			terms.hash(),
			// FIXME: Don't hard-code the timeout, make it dependant on some
			// function(blockchain) to in the future check for congestion... :)
			100
		]);
		await registry.functions.deploy(initcode, 0, HIGH_GAS_LIMIT);

		// LOG STATE CHANNEL STATE
		const channelCfAddr = new CfStateChannel(
			networkContext,
			multisig.address,
			signingKeys,
			app,
			terms,
			100,
			0
		).cfAddress();
		const channelAddr = await registry.functions.resolver(channelCfAddr);
		const stateChannel = new ethers.Contract(
			channelAddr,
			StateChannel.abi,
			masterWallet.wallet
		);

		const uninstallTx = walletA.store.getTransaction(
			balanceRefundAppId,
			ActionName.UNINSTALL
		);
		await masterWallet.wallet.sendTransaction({
			to: uninstallTx.to,
			value: `0x${uninstallTx.value.toString(16)}`,
			data: uninstallTx.data,
			...HIGH_GAS_LIMIT
		});

		console.error(
			`state channel state: ${await stateChannel.functions.state()}`
		);

		// LOG DEPENDENCY NONCE
		const NonceRegistry = require("/app/contracts/build/contracts/NonceRegistry.json");
		const nonceRegistry = new ethers.Contract(
			networkContext.NonceRegistry,
			NonceRegistry.abi,
			masterWallet.wallet
		);
		const salt = ethers.utils.solidityKeccak256(["uint256"], [2]);
		const nonceKey = ethers.utils.solidityKeccak256(
			["address", "uint256"],
			[multisig.address, salt]
		);
		const depNonce = await nonceRegistry.functions.table(nonceKey);
		console.error(`dependency nonce: ${depNonce}`);
		expect(depNonce[0].toString()).toBe("2");

		// await mineBlocks(
		// 	200,
		// 	walletA.blockchainProvider as ethers.providers.JsonRpcProvider
		// );

		// const setupBalanceA = (await walletA.wallet.getBalance()).toString();
		// const setupBalanceB = (await walletB.wallet.getBalance()).toString();

		// THIS STILL BREAKS
		// const setupTx = walletA.store.getTransaction(
		// 	multisig.address,
		// 	ActionName.SETUP
		// );
		// await masterWallet.wallet.sendTransaction({
		// 	to: setupTx.to,
		// 	value: `0x${setupTx.value.toString(16)}`,
		// 	data: setupTx.data
		// });

		// const endBalanceA = await walletA.wallet.getBalance();
		// const endBalanceB = await walletB.wallet.getBalance();
		//
		// console.error(
		// 	`before A=${ethers.utils.formatEther(startBalanceA.toString())}`
		// );
		// console.error(
		// 	`before B=${ethers.utils.formatEther(startBalanceB.toString())}`
		// );
		// console.error(`setup A=${ethers.utils.formatEther(setupBalanceA)}`);
		// console.error(`setup B=${ethers.utils.formatEther(setupBalanceB)}`);
		// console.error(`end A=${ethers.utils.formatEther(endBalanceA)}`);
		// console.error(`end B=${ethers.utils.formatEther(endBalanceB)}`);
		//
		// expect(ethers.utils.formatEther(endBalanceA)).toEqual(
		// 	ethers.utils.formatEther(startBalanceA)
		// );
		// expect(ethers.utils.formatEther(endBalanceB)).toEqual(
		// 	ethers.utils.formatEther(startBalanceB)
		// );
	});
});

async function setup(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet
) {
	validatePresetup(walletA, walletB);
	let msg = setupStartMsg(multisigAddr, walletA.address, walletB.address);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toEqual(ResponseStatus.COMPLETED);
	validateSetup(multisigAddr, walletA, walletB);
}

function validatePresetup(walletA: TestWallet, walletB: TestWallet) {
	expect(walletA.vm.cfState.channelStates).toEqual({});
	expect(walletB.vm.cfState.channelStates).toEqual({});
}

function setupStartMsg(
	multisigAddress: string,
	to: string,
	from: string
): ClientMessage {
	return {
		requestId: "0",
		appId: "",
		action: ActionName.SETUP,
		data: {},
		multisigAddress,
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0,
		signature: undefined
	};
}

function validateSetup(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet
) {
	validateNoAppsAndFreeBalance(multisigAddr, walletA, walletB, 0, 0);
	validateNoAppsAndFreeBalance(multisigAddr, walletB, walletA, 0, 0);
}

/**
 * Validates the correctness of walletAs free balance *not* walletBs.
 */
function validateNoAppsAndFreeBalance(
	multisigAddr: string,
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

	let channel = walletA.vm.cfState.channelStates[multisigAddr];
	console.log("getting channel");
	console.log(state.channelStates);
	expect(Object.keys(state.channelStates).length).toEqual(1);
	expect(channel.counterParty).toEqual(walletB.address);
	expect(channel.me).toEqual(walletA.address);
	expect(channel.multisigAddress).toEqual(multisigAddr);
	expect(channel.appChannels).toEqual({});
	expect(channel.freeBalance.alice).toEqual(peerA);
	expect(channel.freeBalance.bob).toEqual(peerB);
	expect(channel.freeBalance.aliceBalance).toEqual(amountA);
	expect(channel.freeBalance.bobBalance).toEqual(amountB);
}

async function makeDeposits(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet
): Promise<string> {
	await deposit(multisigAddr, walletA, walletB, 10, 0);
	return deposit(multisigAddr, walletB, walletA, 5, 10);
}

// /**
//  * @param amountA is the amount wallet A wants to deposit into the channel.
//  * @param amountBCumualtive is the amount wallet B already has in the channel,
//  *        i.e., the threshold for the balance refund.
//  */
async function deposit(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet,
	amountA: number,
	amountBCumulative: number
): Promise<string> {
	let cfAddr = await installBalanceRefund(
		multisigAddr,
		walletA,
		walletB,
		amountBCumulative
	);
	await depositOnChain(multisigAddr, walletA, amountA);
	await uninstallBalanceRefund(
		multisigAddr,
		cfAddr,
		walletA,
		walletB,
		amountA,
		amountBCumulative
	);
	return cfAddr;
}

async function installBalanceRefund(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet,
	threshold: number
) {
	let msg = startInstallBalanceRefundMsg(
		multisigAddr,
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
	validateInstalledBalanceRefund(multisigAddr, walletB, threshold);
	// check A's client and return the newly created cf address
	return validateInstalledBalanceRefund(multisigAddr, walletA, threshold);
}

function startInstallBalanceRefundMsg(
	multisigAddr: string,
	to: string,
	from: string,
	threshold: number
): ClientMessage {
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
		"0x00000000",
		"0x00000000",
		"0x00000000",
		"0x00000000"
	); // todo
	let timeout = 100;
	let installData: InstallData = {
		peerA: new PeerBalance(peerA, 0),
		peerB: new PeerBalance(peerB, 0),
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
		multisigAddress: multisigAddr,
		toAddress: to,
		fromAddress: from,
		seq: 0
	};
}

function validateInstalledBalanceRefund(
	multisigAddr: string,
	wallet: TestWallet,
	amount: number
) {
	let stateChannel = wallet.vm.cfState.channelStates[multisigAddr];
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

async function depositOnChain(
	multisigAddress: string,
	wallet: TestWallet,
	value: number
) {
	console.log(`💸 Send ${value} to the multisig (${multisigAddress})`);
	await wallet.wallet.sendTransaction({
		to: multisigAddress,
		value
	});
}

async function uninstallBalanceRefund(
	multisigAddr: string,
	cfAddr: string,
	walletA: TestWallet,
	walletB: TestWallet,
	amountA: number,
	amountB: number
) {
	let msg = startUninstallBalanceRefundMsg(
		multisigAddr,
		cfAddr,
		walletA.address,
		walletB.address,
		amountA
	);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toEqual(ResponseStatus.COMPLETED);
	// validate walletA
	validateUninstalledAndFreeBalance(
		multisigAddr,
		cfAddr,
		walletA,
		walletB,
		amountA,
		amountB
	);
	// validate walletB
	validateUninstalledAndFreeBalance(
		multisigAddr,
		cfAddr,
		walletB,
		walletA,
		amountB,
		amountA
	);
}

/**
 * Validates the correctness of walletA's free balance *not* walletB's.
 */
function validateUninstalledAndFreeBalance(
	multisigAddr: string,
	cfAddr: string,
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

	let channel = walletA.vm.cfState.channelStates[multisigAddr];
	let app = channel.appChannels[cfAddr];

	expect(Object.keys(state.channelStates).length).toEqual(1);
	expect(channel.counterParty).toEqual(walletB.address);
	expect(channel.me).toEqual(walletA.address);
	expect(channel.multisigAddress).toEqual(multisigAddr);
	expect(channel.freeBalance.alice).toEqual(peerA);
	expect(channel.freeBalance.bob).toEqual(peerB);
	expect(channel.freeBalance.aliceBalance).toEqual(amountA);
	expect(channel.freeBalance.bobBalance).toEqual(amountB);

	expect(app.dependencyNonce.nonce).toEqual(2);
}

function startUninstallBalanceRefundMsg(
	multisigAddr: string,
	appId: string,
	to: string,
	from: string,
	amount: number
): ClientMessage {
	let uninstallData = {
		peerAmounts: [new PeerBalance(to, amount), new PeerBalance(from, 0)]
	};
	return {
		requestId: "2",
		appId: appId,
		action: ActionName.UNINSTALL,
		data: uninstallData,
		multisigAddress: multisigAddr,
		fromAddress: from,
		toAddress: to,
		stateChannel: undefined,
		seq: 0,
		signature: undefined
	};
}

async function playTtt(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet
) {
	let cfAddr = await installTtt(multisigAddr, walletA, walletB);
	await makeMoves(walletA, walletB, cfAddr);
	await uninstallTtt(walletA, walletB, cfAddr);
	return cfAddr;
}

async function installTtt(
	multisigAddr: string,
	walletA: TestWallet,
	walletB: TestWallet
) {
	let msg = installTttMsg(multisigAddr, walletA.address, walletB.address);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toEqual(ResponseStatus.COMPLETED);
	return await validateInstallTtt(walletA, walletB);
}

function installTttMsg(
	multisigAddr: string,
	to: string,
	from: string
): ClientMessage {
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
		multisigAddress: multisigAddr,
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0,
		signature: undefined
	};
}

async function validateInstallTtt(
	walletA: TestWallet,
	walletB: TestWallet
): Promise<string> {
	validateInstallTttWallet(walletA, walletB);
	// wait for other client to finish, since the machine is async
	await sleep(50);
	return validateInstallTttWallet(walletB, walletA);
}

function validateInstallTttWallet(walletA: TestWallet, walletB: TestWallet) {
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
async function makeMoves(
	walletA: TestWallet,
	walletB: TestWallet,
	cfAddr: string
) {
	let state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	const X = 1;
	const O = 2;

	await makeMove(walletA, walletB, cfAddr, state, 0, X, 1);
	await makeMove(walletB, walletA, cfAddr, state, 4, O, 2);
	await makeMove(walletA, walletB, cfAddr, state, 1, X, 3);
	await makeMove(walletB, walletA, cfAddr, state, 5, O, 4);
	await makeMove(walletA, walletB, cfAddr, state, 2, X, 5);
}

async function makeMove(
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
	let msg = updateTttMsg(state, cell, walletA.address, walletB.address, cfAddr);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toEqual(ResponseStatus.COMPLETED);
	validateMakeMove(walletA, walletB, cfAddr, state, moveNumber);
	await sleep(50);
	validateMakeMove(walletB, walletA, cfAddr, state, moveNumber);
}

function updateTttMsg(
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
		stateChannel: undefined,
		seq: 0,
		signature: undefined
	};
}

function validateMakeMove(
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

async function uninstallTtt(
	walletA: TestWallet,
	walletB: TestWallet,
	cfAddr: string
) {
	let msg = uninstallTttStartMsg(
		cfAddr,
		walletA.address,
		4,
		walletB.address,
		0
	);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toEqual(ResponseStatus.COMPLETED);
	// A wins so give him 2 and subtract 2 from B
	validateUninstallTtt(cfAddr, walletA, 12, 3);
	await sleep(50);
	validateUninstallTtt(cfAddr, walletB, 12, 3);
}

function uninstallTttStartMsg(
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
		stateChannel: undefined,
		seq: 0,
		signature: undefined
	};
}

function validateUninstallTtt(
	cfAddr: string,
	wallet: TestWallet,
	amountA: number,
	amountB: number
) {
	let channel = wallet.vm.cfState.channelStates[MULTISIG_ADDRESS];
	let app = channel.appChannels[cfAddr];
	expect(channel.freeBalance.aliceBalance).toEqual(amountA);
	expect(channel.freeBalance.bobBalance).toEqual(amountB);
	expect(app.dependencyNonce.nonce).toEqual(2);
}

function validateSystem(wallet: TestWallet) {
	// todo
}

async function gotoChain(wallet: TestWallet) {
	// todo
}

async function validateBlockchain(): Promise<any> {
	// todo
}

export async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
