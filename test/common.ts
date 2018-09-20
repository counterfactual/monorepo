import { ActionName, PeerBalance, ClientActionMessage } from "../src/types";
import { MULTISIG_ADDRESS } from "./environment";
import { ResponseStatus } from "../src/vm";
import { TestWallet } from "./wallet/wallet";

export async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * A collection of static methods responsible for running the setup potocol
 * and asserting the machine state was correctly modified.
 */
export class SetupProtocol {
	static async run(walletA: TestWallet, walletB: TestWallet) {
		SetupProtocol.validatePresetup(walletA, walletB);
		await SetupProtocol._run(walletA, walletB);
		SetupProtocol.validate(walletA, walletB);
	}

	/**
	 * Asserts the state of the given wallets is empty.
	 */
	static validatePresetup(walletA: TestWallet, walletB: TestWallet) {
		expect(walletA.currentUser.vm.cfState.channelStates).toEqual({});
		expect(walletB.currentUser.vm.cfState.channelStates).toEqual({});
	}

	private static async _run(walletA: TestWallet, walletB: TestWallet) {
		let msg = SetupProtocol.setupStartMsg(
			walletA.currentUser.address,
			walletB.currentUser.address
		);
		let response = await walletA.runProtocol(msg);
		expect(response.status).toEqual(ResponseStatus.COMPLETED);
	}

	static setupStartMsg(from: string, to: string): ClientActionMessage {
		return {
			requestId: "0",
			appId: "",
			action: ActionName.SETUP,
			data: {},
			multisigAddress: MULTISIG_ADDRESS,
			toAddress: to,
			fromAddress: from,
			seq: 0
		};
	}

	/**
	 * Asserts the setup protocol modifies the machine state correctly.
	 */
	static validate(walletA: TestWallet, walletB: TestWallet) {
		SetupProtocol.validateWallet(walletA, walletB, 0, 0);
		SetupProtocol.validateWallet(walletB, walletA, 0, 0);
	}

	/**
	 * Validates the correctness of walletAs free balance *not* walletBs.
	 */
	static validateWallet(
		walletA: TestWallet,
		walletB: TestWallet,
		amountA: number,
		amountB: number
	) {
		// todo: add nonce and uniqueId params and check them
		let state = walletA.currentUser.vm.cfState;
		let canon = PeerBalance.balances(
			walletA.currentUser.address,
			amountA,
			walletB.currentUser.address,
			amountB
		);
		let channel =
			walletA.currentUser.vm.cfState.channelStates[MULTISIG_ADDRESS];
		expect(Object.keys(state.channelStates).length).toEqual(1);
		expect(channel.counterParty).toEqual(walletB.address);
		expect(channel.me).toEqual(walletA.address);
		expect(channel.multisigAddress).toEqual(MULTISIG_ADDRESS);
		expect(channel.appChannels).toEqual({});
		expect(channel.freeBalance.alice).toEqual(canon.peerA.address);
		expect(channel.freeBalance.bob).toEqual(canon.peerB.address);
		expect(channel.freeBalance.aliceBalance).toEqual(canon.peerA.balance);
		expect(channel.freeBalance.bobBalance).toEqual(canon.peerB.balance);
	}
}
