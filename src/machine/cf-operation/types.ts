export enum Operation {
	Call,
	Delegatecall
}

export class Transaction {
	constructor(
		readonly to: string,
		readonly value: Number,
		readonly data: string
	) {}
}
export class MultisigTransaction extends Transaction {
	constructor(
		readonly to: string,
		readonly value: Number,
		readonly data: string,
		readonly operation: Operation
	) {
		super(to, value, data);
	}
}
