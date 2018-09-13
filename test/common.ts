import { expect } from "chai";

import { ActionName, ClientMessage, PeerBalance } from "../src/types";
import { MULTISIG_ADDRESS } from "./constants";
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
		expect(walletA.vm.cfState.channelStates).to.eql({});
		expect(walletB.vm.cfState.channelStates).to.eql({});
	}

	private static async _run(walletA: TestWallet, walletB: TestWallet) {
		let msg = SetupProtocol.setupStartMsg(walletA.address, walletB.address);
		let response = await walletA.runProtocol(msg);
		expect(response.status).to.equal(ResponseStatus.COMPLETED);
	}

	static setupStartMsg(to: string, from: string): ClientMessage {
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
		let state = walletA.vm.cfState;
		let canon = PeerBalance.balances(
			walletA.address,
			amountA,
			walletB.address,
			amountB
		);
		let channel = walletA.vm.cfState.channelStates[MULTISIG_ADDRESS];
		expect(Object.keys(state.channelStates).length).to.equal(1);
		expect(channel.counterParty).to.equal(walletB.address);
		expect(channel.me).to.equal(walletA.address);
		expect(channel.multisigAddress).to.equal(MULTISIG_ADDRESS);
		expect(channel.appChannels).to.eql({});
		expect(channel.freeBalance.alice).to.equal(canon.peerA.address);
		expect(channel.freeBalance.bob).to.equal(canon.peerB.address);
		expect(channel.freeBalance.aliceBalance).to.equal(canon.peerA.balance);
		expect(channel.freeBalance.bobBalance).to.equal(canon.peerB.balance);
	}
}
