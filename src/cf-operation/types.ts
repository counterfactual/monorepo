import * as ethers from "ethers";
import { Address, Signature, H256, Bytes4, NetworkContext } from "../types";
import { PaymentApp } from "./contracts/paymentApp";

export const zeroAddress = "0x0000000000000000000000000000000000000000";
export const zeroBytes32 =
	"0x0000000000000000000000000000000000000000000000000000000000000000";

// todo: remove this and fetch the abi's from the build artifacts
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
	abstract hashToSign(): H256;
	abstract transaction(sigs: Signature[]): Transaction;
}

export class CfAppInterface {
	constructor(
		readonly address: Address,
		readonly reducer: Bytes4,
		readonly resolver: Bytes4,
		readonly turnTaker: Bytes4,
		readonly isStateFinal: Bytes4
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
		readonly timeout: number
	) {}

	static terms(): Terms {
		return new Terms(0, 0, zeroAddress);
	}

	static contractInterface(ctx: NetworkContext): CfAppInterface {
		let address = ctx.PaymentAppAddress;
		let reducer = "0x00000000"; // not used
		let resolver = new ethers.Interface(PaymentApp.abi).functions.resolver
			.sighash;
		let turnTaker = "0x00000000"; // not used
		let isStateFinal = "0x00000000"; // not used
		return new CfAppInterface(
			address,
			reducer,
			resolver,
			turnTaker,
			isStateFinal
		);
	}
}

export class CfNonce {
	constructor(readonly salt: H256, readonly nonce: number) {}
}

/**
 * Maps 1-1 with StateChannel.sol (with the addition of the uniqueId, which
 * is used to calculate the cf address).
 */
export class CfStateChannel {
	constructor(
		/**
		 * The multisig controlling the funds.
		 */
		readonly owner: Address,
		readonly signingKeys: Address[],
		readonly cfApp: CfAppInterface,
		readonly terms: Terms,
		readonly timeout: number,
		readonly uniqueId: number
	) {}

	// todo: decide if we want this inside of this class
	cfAddress(): H256 {
		/*
			 * constructor(
			 *   address owner,
			 *   address[] signingKeys,
			 *   bytes32 app,
			 *   bytes32 terms,
			 *   uint256 timeout
			 * )
			 */
		/*
				let initcode = ethers.Contract.getDeployTransaction(
				StateChannel.bytecode,
				StateChannel.abi,
				app.owner,
				app.signingKeys,
				app.cfApp.hash(),
				app.terms.hash(),
				app.timeout
				).data;
			*/
		// todo: why is the bytecode for StateChannel breaking ethers?
		let initcode =
			"0x60806040523480156200001157600080fd5b5060405162003621380380620036";
		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes", "uint256"],
			["0x19", initcode, this.uniqueId]
		);
	}
}
