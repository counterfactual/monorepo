import { CfPeerAmount } from "./types";

// TODO: delete this file after completing install and uninstall

export class StateChannelContext {
	constructor(
		readonly multisigAddr: string,
		readonly myAddr: string,
		readonly peerAddr: string,
		readonly system?: StateChannelSystem, // not used in setup protocol
		public networkContext?: Object
	) {
		this.networkContext = {
			CounterfactualAppAddress: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			RegistryAddress: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			WithdrawAppInterpreterAddress:
				"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			WithdrawAppInterpreterSighash: "0xaaaabbbb",
			AssetDispatcherAddress: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			AssetDispatcherSighashForETH: "0xbbbbaaaa",
			WithdrawAppBytecode: "0x0"
		};
	}

	getOwners(): Array<string> {
		return [this.myAddr, this.peerAddr];
	}
}

export class StateChannelSystem {
	private idCounter: number = 0;
	peerA: string;
	peerB: string;
	nonce: Nonce;
	freeBalance: FreeBalance;

	/**
	 * The unique id is a global counter over all apps in the state channel.
	 */
	generateUniqueId() {
		this.idCounter += 1;
		return this.idCounter;
	}

	/**
	 * Persists the unsaved changes to the state channel system.
	 * Called when a protocol has completed.
	 */
	// not sure if we want to do this commiting here...just made the commit as
	// a general todo
	commit() {
		// todo
	}
}

// TODO: we probably want to lock apps when there are changes in a pending
//       state, since we're in the middle of a protocol execution
export class App {
	constructor(readonly uniqueId: number, public localNonce: number) {}

	/**
	 * Persists the new app state and unlocks it for adjustment by other
	 * protocols.
	 */
	commit() {
		// todo
	}

	incrementNonce(): number {
		this.localNonce += 1;
		return this.localNonce;
	}
}

export class Nonce extends App {}

export class FreeBalance extends App {
	constructor(
		readonly uniqueId: number,
		readonly assetClass: string,
		public peerAmountA: CfPeerAmount,
		public peerAmountB: CfPeerAmount,
		readonly localNonce: number
	) {
		super(uniqueId, localNonce);
	}

	mutateAdd(peerAmounts: Array<CfPeerAmount>) {
		const newBals = this.add(peerAmounts);
		this.peerAmountA = newBals[0];
		this.peerAmountB = newBals[1];
	}

	mutateDeduct(peerAmounts: Array<CfPeerAmount>) {
		const newBals = this.deduct(peerAmounts);
		this.peerAmountA = newBals[0];
		this.peerAmountB = newBals[1];
	}

	deduct(peerAmounts: Array<CfPeerAmount>): Array<CfPeerAmount> {
		const amountA = new CfPeerAmount(
			this.peerAmountA.addr,
			this.peerAmountA.amount
		);
		const amountB = new CfPeerAmount(
			this.peerAmountB.addr,
			this.peerAmountB.amount
		);
		if (peerAmounts[0].addr === this.peerAmountA.addr) {
			amountA.amount -= peerAmounts[0].amount;
			amountB.amount -= peerAmounts[1].amount;
		} else {
			amountB.amount -= peerAmounts[0].amount;
			amountA.amount -= peerAmounts[1].amount;
		}
		return [amountA, amountB];
	}

	add(peerAmounts: Array<CfPeerAmount>): Array<CfPeerAmount> {
		const amountA = new CfPeerAmount(
			this.peerAmountA.addr,
			this.peerAmountA.amount
		);
		const amountB = new CfPeerAmount(
			this.peerAmountB.addr,
			this.peerAmountB.amount
		);
		if (peerAmounts[0].addr === this.peerAmountA.addr) {
			amountA.amount += peerAmounts[0].amount;
			amountB.amount += peerAmounts[1].amount;
		} else {
			amountB.amount += peerAmounts[0].amount;
			amountA.amount += peerAmounts[1].amount;
		}
		return [amountA, amountB];
	}
}
