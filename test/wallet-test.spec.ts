import * as ethers from "ethers";
import { TestWallet } from "./wallet/wallet";
import { ClientActionMessage, WalletMessaging } from "../src/types";
import {
	Terms,
	CfAppInterface,
	zeroAddress,
	zeroBytes32
} from "../src/middleware/cf-operation/types";
import { ClientInterface } from "../src/client/client-interface";
import { AppChannelClient } from "../src/client/app-channel-client";
import {
	MULTISIG_PRIVATE_KEY,
	A_PRIVATE_KEY,
	B_PRIVATE_KEY,
	A_ADDRESS,
	B_ADDRESS,
	MULTISIG_ADDRESS
} from "./constants";
import { sleep } from "./common";

const PAYMENT_APP_ENCODING =
	"tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";
const INSTALL_OPTIONS = {
	peerABalance: 0,
	abiEncoding: PAYMENT_APP_ENCODING,
	state: {
		alice: A_ADDRESS,
		bob: B_ADDRESS,
		aliceBalance: ethers.utils.bigNumberify(10).toString(),
		bobBalance: ethers.utils.bigNumberify(10).toString()
	}
};

class ClientWalletBridge implements WalletMessaging {
	wallet: TestWallet;
	constructor(wallet: TestWallet) {
		this.wallet = wallet;
	}
	postMessage(message: ClientActionMessage, to: string) {
		// TODO move this into a setTimeout to enfore asyncness of the call
		this.wallet.receiveMessageFromClient(message);
	}
	onMessage(userId: string, callback: Function) {
		this.wallet.onResponse(callback);
	}
}

let multisigContractAddress;

describe("Lifecycle", async () => {
	// extending the timeout to allow the async machines to finish
	jest.setTimeout(30000);

	it("wallet can be used to deploy a multisig", async () => {
		// This wallet is used _only_ to deploy the multisig
		const multisigWallet = new TestWallet();
		multisigWallet.setUser(MULTISIG_ADDRESS, MULTISIG_PRIVATE_KEY);

		const multisigContract = await ClientInterface.deployMultisig(
			multisigWallet.currentUser.ethersWallet
		);
		expect(multisigContract.address).not.toBe(null);
		multisigContractAddress = multisigContract.address;
	});

	it("Can observe an installation of an app", async () => {
		expect.hasAssertions();

		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);
		let connectionA = new ClientWalletBridge(walletA);
		let connectionB = new ClientWalletBridge(walletB);
		let clientA = new ClientInterface("some-user-id", connectionA);
		let clientB = new ClientInterface("some-user-id", connectionB);
		await clientA.init();
		await clientB.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let stateChannelA = await clientA.setup(B_ADDRESS, multisigContractAddress);
		await clientB.getOrCreateStateChannel(A_ADDRESS, multisigContractAddress);
		clientB.addObserver("installCompleted", data => {
			expect(true).toBeTruthy();
		});
		await stateChannelA.install("paymentApp", INSTALL_OPTIONS);

		await sleep(50);
	});

	it("Can remove observers", async () => {
		expect.hasAssertions();

		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);
		let connectionA = new ClientWalletBridge(walletA);
		let connectionB = new ClientWalletBridge(walletB);
		let clientA = new ClientInterface("some-user-id", connectionA);
		let clientB = new ClientInterface("some-user-id", connectionB);
		await clientA.init();
		await clientB.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let stateChannelA = await clientA.setup(B_ADDRESS, multisigContractAddress);
		await clientB.getOrCreateStateChannel(A_ADDRESS, multisigContractAddress);
		let falsyCallback = () => expect(false).toBeTruthy();
		clientB.addObserver("installCompleted", data => {
			expect(true).toBeTruthy();
		});
		clientB.addObserver("installCompleted", falsyCallback);
		clientB.removeObserver("installCompleted", falsyCallback);
		await stateChannelA.install("paymentApp", INSTALL_OPTIONS);

		await sleep(50);
	});

	it("Will notify only the current user", async () => {
		expect.hasAssertions();

		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);
		let connectionA = new ClientWalletBridge(walletA);
		let connectionB = new ClientWalletBridge(walletB);
		let clientA = new ClientInterface("some-user-id", connectionA);
		let clientB = new ClientInterface("some-user-id", connectionB);

		clientB.addObserver("installCompleted", data => {
			expect(false).toBeTruthy();
		});

		walletB.setUser(
			"0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd2",
			B_PRIVATE_KEY
		);

		await clientA.init();
		await clientB.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let threshold = 10;

		let stateChannelA = await clientA.setup(
			"0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd2",
			multisigContractAddress
		);
		let stateChannelB = await clientB.getOrCreateStateChannel(
			B_ADDRESS,
			multisigContractAddress
		);

		clientB.addObserver("installCompleted", data => {
			expect(true).toBeTruthy();
		});

		await stateChannelA.install("paymentApp", INSTALL_OPTIONS);
		let uninstallAmountA = 10;
		let uninstallAmountB = 0;

		await sleep(50);
	});

	it("Can install an app", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connection = new ClientWalletBridge(walletA);
		let client = new ClientInterface("some-user-id", connection);
		await client.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let threshold = 10;

		let stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
		await stateChannel.install("paymentApp", INSTALL_OPTIONS);

		await sleep(50);
		// check B's client
		validateInstalledBalanceRefund(walletB, threshold);
		// check A's client and return the newly created cf address
		validateInstalledBalanceRefund(walletA, threshold);
	});

	it("Can uninstall an app", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connection = new ClientWalletBridge(walletA);
		let client = new ClientInterface("some-user-id", connection);
		await client.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
		let appChannel = await stateChannel.install("paymentApp", INSTALL_OPTIONS);

		let uninstallAmountA = 10;
		let uninstallAmountB = 0;

		await appChannel.uninstall({ amount: uninstallAmountA });

		// validate walletA
		validateNoAppsAndFreeBalance(
			walletA,
			walletB,
			uninstallAmountA,
			uninstallAmountB
		);
		// validate walletB
		validateNoAppsAndFreeBalance(
			walletB,
			walletA,
			uninstallAmountB,
			uninstallAmountA
		);
	});

	it("Can update an app", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connection = new ClientWalletBridge(walletA);
		let client = new ClientInterface("some-user-id", connection);
		await client.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let threshold = 10;

		let stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
		let appChannel = await stateChannel.install("paymentApp", INSTALL_OPTIONS);

		await makePayments(walletA, walletB, appChannel);
	});

	it("Can change users", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connection = new ClientWalletBridge(walletA);
		let client = new ClientInterface("some-user-id", connection);
		await client.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let threshold = 10;

		let stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
		await stateChannel.install("paymentApp", INSTALL_OPTIONS);

		await sleep(50);

		validateInstalledBalanceRefund(walletA, threshold);

		const C_ADDRESS = "0xB37ABb9F5CCc5Ce5f2694CE0720216B786cad61D";
		walletA.setUser(C_ADDRESS, A_PRIVATE_KEY);

		let state = walletA.currentUser.vm.cfState;
		expect(Object.keys(state.channelStates).length).toBe(0);

		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);

		validateInstalledBalanceRefund(walletA, threshold);
	});

	it("Can query freeBalance", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connection = new ClientWalletBridge(walletA);
		let client = new ClientInterface("some-user-id", connection);
		await client.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
		await stateChannel.install("paymentApp", INSTALL_OPTIONS);
		let freeBalance = await stateChannel.queryFreeBalance();

		expect(freeBalance.data.freeBalance.aliceBalance).toBe(0);
		expect(freeBalance.data.freeBalance.bobBalance).toBe(0);
	});

	it("Can query stateChannel", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connection = new ClientWalletBridge(walletA);
		let clientA = new ClientInterface("some-user-id", connection);
		await clientA.init();

		walletA.currentUser.io.peer = walletB;
		walletB.currentUser.io.peer = walletA;

		let stateChannelAB = await clientA.setup(
			B_ADDRESS,
			multisigContractAddress
		);
		await stateChannelAB.install("paymentApp", INSTALL_OPTIONS);
		let stateChannelInfo = await stateChannelAB.queryStateChannel();

		expect(stateChannelInfo.data.stateChannel.counterParty).toBe(
			stateChannelAB.toAddress
		);
		expect(stateChannelInfo.data.stateChannel.me).toBe(
			stateChannelAB.fromAddress
		);
		expect(stateChannelInfo.data.stateChannel.multisigAddress).toBe(
			multisigContractAddress
		);
	});

	it("Allows apps to communicate directly with each other", async () => {
		let walletA = new TestWallet();
		let walletB = new TestWallet();
		walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
		walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);

		let connectionA = new ClientWalletBridge(walletA);
		let clientA = new ClientInterface("some-user-id", connectionA);

		let connectionB = new ClientWalletBridge(walletB);
		let clientB = new ClientInterface("some-user-id", connectionB);

		walletA.onMessage(msg => {
			clientA.sendIOMessage(msg);
		});
		walletB.onMessage(msg => {
			clientB.sendIOMessage(msg);
		});

		clientA.registerIOSendMessage(msg => {
			clientB.receiveIOMessage(msg);
		});
		clientB.registerIOSendMessage(msg => {
			clientA.receiveIOMessage(msg);
		});

		await clientA.init();
		await clientB.init();

		let stateChannel = await clientA.setup(B_ADDRESS, multisigContractAddress);
		await stateChannel.install("paymentApp", INSTALL_OPTIONS);

		let threshold = 10;

		await sleep(50);

		validateInstalledBalanceRefund(walletB, threshold);
		validateInstalledBalanceRefund(walletA, threshold);
	});
});

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
	let state = walletA.currentUser.vm.cfState;

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

	let channel =
		walletA.currentUser.vm.cfState.channelStates[multisigContractAddress];
	expect(Object.keys(state.channelStates).length).toBe(1);
	expect(channel.counterParty).toBe(walletB.address);
	expect(channel.me).toBe(walletA.address);
	expect(channel.multisigAddress).toBe(multisigContractAddress);
	expect(channel.freeBalance.alice).toBe(peerA);
	expect(channel.freeBalance.bob).toBe(peerB);
	expect(channel.freeBalance.aliceBalance).toBe(amountA);
	expect(channel.freeBalance.bobBalance).toBe(amountB);

	Object.keys(channel.appChannels).forEach(appId => {
		expect(channel.appChannels[appId].dependencyNonce.nonce).toBe(2);
	});
}

function validateInstalledBalanceRefund(wallet: TestWallet, amount: number) {
	let stateChannel =
		wallet.currentUser.vm.cfState.channelStates[multisigContractAddress];
	let appChannels = stateChannel.appChannels;
	let cfAddrs = Object.keys(appChannels);
	expect(cfAddrs.length).toBe(1);

	let cfAddr = cfAddrs[0];

	expect(appChannels[cfAddr].peerA.balance).toBe(0);
	expect(appChannels[cfAddr].peerA.address).toBe(
		stateChannel.freeBalance.alice
	);
	expect(appChannels[cfAddr].peerA.balance).toBe(0);

	expect(appChannels[cfAddr].peerB.balance).toBe(0);
	expect(appChannels[cfAddr].peerB.address).toBe(stateChannel.freeBalance.bob);
	expect(appChannels[cfAddr].peerB.balance).toBe(0);

	return cfAddr;
}

async function makePayments(
	walletA: TestWallet,
	walletB: TestWallet,
	appChannel: AppChannelClient
) {
	await makePayment(walletA, walletB, appChannel, "5", "15", 1);
	await makePayment(walletA, walletB, appChannel, "7", "12", 2);
	await makePayment(walletA, walletB, appChannel, "13", "6", 3);
	await makePayment(walletA, walletB, appChannel, "17", "2", 4);
	await makePayment(walletA, walletB, appChannel, "12", "8", 5);
}

async function makePayment(
	walletA: TestWallet,
	walletB: TestWallet,
	appChannel: AppChannelClient,
	aliceBalance: string,
	bobBalance: string,
	totalUpdates: number
) {
	let newState = Object.assign({}, INSTALL_OPTIONS.state, {
		aliceBalance: ethers.utils.bigNumberify(aliceBalance),
		bobBalance: ethers.utils.bigNumberify(bobBalance)
	});

	await appChannel.update({ state: newState });
	validateUpdatePayment(walletA, walletB, appChannel, newState, totalUpdates);
}

function validateUpdatePayment(
	walletA: TestWallet,
	walletB: TestWallet,
	appChannel: AppChannelClient,
	appState: object,
	totalUpdates: number
) {
	let appA =
		walletA.currentUser.vm.cfState.channelStates[multisigContractAddress]
			.appChannels[appChannel.appId];
	let appB =
		walletB.currentUser.vm.cfState.channelStates[multisigContractAddress]
			.appChannels[appChannel.appId];

	let encodedAppState = appChannel.appInterface.encode(appState);
	let appStateHash = appChannel.appInterface.stateHash(appState);

	expect(appA.encodedState).toBe(encodedAppState);
	expect(appA.appStateHash).toBe(appStateHash);
	expect(appA.localNonce).toBe(totalUpdates + 1);
	expect(appB.encodedState).toBe(encodedAppState);
	expect(appB.appStateHash).toBe(appStateHash);
	expect(appB.localNonce).toBe(totalUpdates + 1);
}
