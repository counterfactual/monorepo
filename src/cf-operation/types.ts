import * as ethers from "ethers";
import { Address, Signature } from "../types";

export const zeroAddress = "0x0000000000000000000000000000000000000000";
export const zeroBytes32 =
	"0x0000000000000000000000000000000000000000000000000000000000000000";

// todo: once we integrate into monorepo, remove this and fetch the abi's from
// the build artifacts
export const Abi = {
	// ConditionalTranfer.sol
	executeStateChannelConditionalTransfer:
		"executeStateChannelConditionalTransfer(bytes32,uint256,bytes32,tuple(uint8,uint256,address))",
	// MinimumViableMultisig.sol
	execTransaction: "execTransaction(address,uint256,bytes,uint256,bytes)",
	// Multisend.sol
	multiSend: "multiSend(bytes)",
	// Registry.sol
	proxyCall: "proxyCall(address,bytes32,bytes)",
	// StateChannel.sol
	setState: "setState(bytes32,uint256,uint256,bytes)",
	// NonceRegistry.sol
	setNonce: "setNonce(bytes32,uint256)"
};

export abstract class CfOperation {
	abstract hashToSign(): string;
	abstract transaction(sigs: Signature[]): Transaction;
}

/*
 * struct App {
 *   address addr;
 *   bytes4 reducer;
 *   bytes4 resolver;
 *   bytes4 turnTaker;
 *   bytes4 isStateFinal;
 * }
 */
export class CfApp {
	constructor(
		readonly address: Address,
		readonly reducer: string,
		readonly resolver: string,
		readonly turnTaker: string,
		readonly isStateFinal: string
	) {}

	hash(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "bytes4", "bytes4", "bytes4", "bytes4"],
			[
				"0x19",
				this.address,
				this.reducer,
				this.resolver,
				this.turnTaker,
				this.isStateFinal
			]
		);
	}
}

export class Terms {
	constructor(
		readonly assetType: number,
		readonly limit: number,
		readonly token: Address
	) {}

	hash(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "uint8", "uint256", "address"],
			["0x19", this.assetType, this.limit, this.token]
		);
	}
}

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

export class MultisigInput {
	constructor(
		readonly to: string,
		readonly val: number,
		readonly data: string,
		readonly op: Operation
	) {}
}

// todo: redundant with multisig input
export class MultiSendInput {
	constructor(
		readonly to: string,
		readonly val: number,
		readonly data: string,
		readonly op: Operation
	) {}
}

export class MultiSend {
	constructor(readonly transactions: Array<MultisigInput>) {}

	public input(multisend: Address): MultisigInput {
		let txs: string = "0x";
		for (let i = 0; i < this.transactions.length; i++) {
			txs += ethers.utils.defaultAbiCoder
				.encode(
					["tuple(uint256,address,uint256,bytes)"],
					[
						[
							this.transactions[i].op,
							this.transactions[i].to,
							this.transactions[i].val,
							this.transactions[i].data
						]
					]
				)
				.substr(2);
		}
		return new MultisigInput(multisend, 0, txs, Operation.Delegatecall);
	}
}
