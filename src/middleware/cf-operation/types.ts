import * as ethers from "ethers";
import {
	Bytes,
	Address,
	Signature,
	H256,
	Bytes32,
	Bytes4,
	NetworkContext
} from "../../types";

export const zeroAddress = "0x0000000000000000000000000000000000000000";
export const zeroBytes32 =
	"0x0000000000000000000000000000000000000000000000000000000000000000";

// todo: remove this and fetch the abi's from the build artifacts
export const Abi = {
	// ConditionalTranfer.sol
	executeStateChannelConditionalTransfer:
		"executeStateChannelConditionalTransfer(address,address,bytes32,uint256,bytes32,tuple(uint8,uint256,address))",
	// MinimumViableMultisig.sol
	execTransaction:
		"tuple(address to, uint256 value, bytes data, uint8 operation, bytes signatures)",
	// Multisend.sol
	multiSend: "multiSend(bytes)",
	// Registry.sol
	proxyCall: "proxyCall(address,bytes32,bytes)",
	// StateChannel.sol
	setState: "setState(bytes32,uint256,uint256,bytes)",
	// NonceRegistry.sol
	setNonce: "setNonce(bytes32,uint256)",
	finalizeNonce: "finalizeNonce(bytes32)"
};

export abstract class CfOperation {
	abstract hashToSign(): H256;
	abstract transaction(sigs: Signature[]): Transaction;
}

export class CfAppInterface {
	constructor(
		readonly address: Address,
		readonly applyAction: Bytes4,
		readonly resolve: Bytes4,
		readonly turn: Bytes4,
		readonly isStateTerminal: Bytes4
	) {}

	hash(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "bytes4", "bytes4", "bytes4", "bytes4"],
			[
				"0x19",
				this.address,
				this.applyAction,
				this.resolve,
				this.turn,
				this.isStateTerminal
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
	Call = 0,
	Delegatecall = 1
}

export class Transaction {
	constructor(
		readonly to: Address,
		readonly value: Number,
		readonly data: string
	) {}
}
export class MultisigTransaction extends Transaction {
	constructor(
		readonly to: Address,
		readonly value: Number,
		readonly data: Bytes,
		readonly operation: Operation
	) {
		super(to, value, data);
	}
}

export class MultisigInput {
	constructor(
		readonly to: Address,
		readonly val: number,
		readonly data: Bytes,
		readonly op: Operation,
		readonly signatures?: Signature[]
	) {}
}

// todo: redundant with multisig input
export class MultiSendInput {
	constructor(
		readonly to: Address,
		readonly val: number,
		readonly data: Bytes,
		readonly op: Operation
	) {}
}
export class MultiSend {
	constructor(readonly transactions: Array<MultisigInput>) {}

	public input(multisend: Address): MultisigInput {
		let txs: string = "0x";
		for (const transaction of this.transactions) {
			txs += ethers.utils.defaultAbiCoder
				.encode(
					["uint256", "address", "uint256", "bytes"],
					[transaction.op, transaction.to, transaction.val, transaction.data]
				)
				.substr(2);
		}

		let data = new ethers.Interface([Abi.multiSend]).functions.multiSend.encode(
			[txs]
		);
		return new MultisigInput(multisend, 0, data, Operation.Delegatecall);
	}
}

/**
 * The state of a free balance object. Passing this into an install or uninstall
 * will update the free balance object to the values given here.
 */
export class CfFreeBalance {
	constructor(
		readonly alice: Address, // first person in free balance object
		readonly aliceBalance: number,
		readonly bob: Address, // second person in free balance object
		readonly bobBalance: number,
		readonly uniqueId: number,
		readonly localNonce: number,
		readonly timeout: number,
		readonly nonce: CfNonce
	) {}

	static terms(): Terms {
		// FIXME: Change implementation of free balance on contracts layer
		return new Terms(
			0, // 0 means ETH
			10000000000000,
			zeroAddress
		);
	}

	static contractInterface(ctx: NetworkContext): CfAppInterface {
		console.log(`remove this line: this should be not 0 --> ${ctx.PaymentApp}`);
		let address = ctx.PaymentApp;
		let applyAction = "0x00000000"; // not used
		let resolver = new ethers.Interface([
			// TODO: Put this somewhere eh
			"resolve(tuple(address,address,uint256,uint256),tuple(uint8,uint256,address))"
		]).functions.resolve.sighash;
		let turn = "0x00000000"; // not used
		let isStateTerminal = "0x00000000"; // not used
		return new CfAppInterface(
			address,
			applyAction,
			resolver,
			turn,
			isStateTerminal
		);
	}
}

export class CfNonce {
	public salt: Bytes32;
	public nonce: number;
	constructor(uniqueId: number, nonce?: number) {
		this.salt = ethers.utils.solidityKeccak256(["uint256"], [uniqueId]);
		if (!nonce) {
			nonce = 1;
		}
		this.nonce = nonce;
	}
}

/**
 * Maps 1-1 with StateChannel.sol (with the addition of the uniqueId, which
 * is used to calculate the cf address).
 *
 * @param signingKeys *must* be in sorted lexicographic order.
 */
export class CfStateChannel {
	constructor(
		readonly ctx: NetworkContext,
		readonly owner: Address,
		readonly signingKeys: Address[],
		readonly cfApp: CfAppInterface,
		readonly terms: Terms,
		readonly timeout: number,
		readonly uniqueId: number
	) {}

	cfAddress(): H256 {
		const StateChannel = require("/app/contracts/build/contracts/StateChannel.json");

		StateChannel.bytecode = StateChannel.bytecode.replace(
			/__Signatures_+/g,
			this.ctx.Signatures.substr(2)
		);

		StateChannel.bytecode = StateChannel.bytecode.replace(
			/__StaticCall_+/g,
			this.ctx.StaticCall.substr(2)
		);

		const initcode = new ethers.Interface(
			StateChannel.abi
		).deployFunction.encode(StateChannel.bytecode, [
			this.owner,
			this.signingKeys,
			this.cfApp.hash(),
			this.terms.hash(),
			this.timeout
		]);

		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes", "uint256"],
			["0x19", initcode, this.uniqueId]
		);
	}
}
