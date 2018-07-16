import { CfPeerAmount } from "../client/cf-app-store";

// todo: this should persist and be able to bootup the state channel client

// should probably also have a "system" for the entire client, that holds
// many StateChannelSystem's on a per state channel basis
export class StateChannelSystem {
	private idCounter: number = 0;
	peerA: string;
	peerB: string;
	nonce: Nonce;
	freeBalance: FreeBalance;

	/**
	 * Order of the peers matters here since the free balances will be
	 * updated accordingly. Initiator of setupChannel is always peerA,
	 * receiver is always peerB.
	 */
	static makeSystem(peerA: string, peerB: string): StateChannelSystem {
		let system = new StateChannelSystem();
		system.peerA = peerA;
		system.peerB = peerB;
		system.nonce = system.makeNonce();
		system.freeBalance = system.makeFreeBalance(peerA, peerB);
		return system;
	}

	/**
	 * First nonce has id = 1.
	 */
	private makeNonce(): Nonce {
		this.idCounter += 1;
		return new Nonce(this.idCounter, 1);
	}

	/**
	 * First free balance has id = 2.
	 */
	private makeFreeBalance(peerA: string, peerB: string): FreeBalance {
		this.idCounter += 1;
		return new FreeBalance(
			this.idCounter,
			"ETH",
			new CfPeerAmount(peerA, 0),
			new CfPeerAmount(peerB, 0),
			1
		);
	}

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
