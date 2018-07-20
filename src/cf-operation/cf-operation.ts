import * as ethers from "ethers";

import { Transaction, MultisigTransaction, Operation } from "./types";
import { Signature } from "../types";
import { MultiSend } from "./multisend";

export { CfOpInstall } from "./cf-op-install";
export { CfOpUninstall } from "./cf-op-uninstall";

// FIXME: Get real addresses for these things
const CONDITIONAL_TRANSFER_ADDRESS =
	"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4";
const MULTISEND_CONTRACT_ADDRESS = "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4";
const REGISTRY_ADDRESS = "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4";

const Interfaces = {
	// CounterfactualApp
	SetStateWithSigningKeys:
		"setStateWithSigningKeys(bytes,uint256,tuple(uint256[],bytes32[],bytes32[]))",
	SetStateAsOwner: "setStateAsOwner(bytes,uint256)",
	// Registry
	Deploy: "deploy(bytes,bytes32)",
	Resolve: "resolve(bytes32)",
	ProxyCall: "proxyCall(address,bytes32,bytes)",
	// Multisig
	ExecTransaction:
		"execTransaction(address,uint256,bytes,uint256,uint8[],bytes32[],bytes32[])",
	// ConditionalTransfer
	MakeConditionalTransfer:
		"makeConditionalTransfer( \
			tuple( \
				tuple( \
					tuple( \
						address registry, \
						bytes32 addr \
					) dest, \
					bytes4 selector \
				) func, \
				bytes parameters, \
				bytes expectedValue \
			)[], \
			tuple( \
				tuple( \
					address registry, \
					bytes32 addr \
				) dest, \
				bytes4 selector \
			), \
			tuple( \
				tuple( \
					address registry, \
					bytes32 addr \
				) dest, \
				bytes4 selector \
			)[], \
			tuple( \
				tuple( \
					address registry, \
					bytes32 addr \
				) dest, \
				bytes4 selector \
			) \
		)"
};

export abstract class CfOperation {
	signatures: Array<Signature>;
	public abstract getHashToSign(): string;
	public abstract getTransaction(): Transaction;
	public abstract getTransactionForMulti(): MultisigTransaction;
	public addSignature(address: string, signature: Signature) {
		const signer: string = ethers.Wallet.verifyMessage(
			this.getHashToSign(),
			signature.toString()
		);
		if (signer !== address) {
			console.error(`${address} did not sign this message.`);
			throw Error();
		}
		this.signatures.push(signature);
	}
	public getSignatures(): Array<Signature> {
		return this.signatures || [];
	}
}

export class Address {
	constructor(readonly registry: string, readonly cfaddress: string) {}
	public toJson(): Object {
		return {
			registry: this.registry,
			addr: this.cfaddress
		};
	}
	public async lookup(): Promise<string> {
		if (this.registry === "") {
			return await ethers.utils.AbiCoder.defaultCoder.encode([
				"bytes20",
				this.cfaddress
			]);
		} else {
			const registry = new ethers.Contract(
				this.registry,
				[Interfaces.Resolve],
				ethers.providers.getDefaultProvider()
			);
			return await registry.isDeployed(this.cfaddress);
		}
	}
}

export class Function {
	constructor(readonly address: Address, readonly selector: string) {}
	public toJson(): Object {
		return {
			dest: this.address.toJson(),
			selector: this.selector
		};
	}
}

export class Condition {
	constructor(
		readonly func: Function,
		readonly calldata: string,
		readonly expectedResult: string
	) {}
	public toJson(): Object {
		return {
			func: this.func.toJson(),
			parameters: this.calldata,
			expectedValue: this.expectedResult
		};
	}
}

export class App {
	constructor(
		readonly conditions: Array<Condition>,
		readonly appAddress: Address,
		readonly pipeline: Array<Function>,
		readonly payoutFunction: Function
	) {}
}

export class CFAppUpdateWithSigningKeys extends CfOperation {
	constructor(
		readonly cfaddress: string,
		readonly id: number,
		readonly appState: string,
		readonly nonce: number
	) {
		super();
	}

	public getHashToSign(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "uint256", "bytes", "uint256"],
			["0x19", this.id, this.appState, this.nonce]
		);
	}

	public getTransaction(): Transaction {
		let vrs = Signature.toVRSObject(this.getSignatures());
		return new Transaction(
			REGISTRY_ADDRESS,
			0,
			new ethers.Interface([Interfaces.ProxyCall]).functions.proxyCall(
				REGISTRY_ADDRESS,
				this.cfaddress,
				new ethers.Interface([
					Interfaces.SetStateWithSigningKeys
				]).functions.setStateWithSigningKeys(this.appState, this.nonce, [
					vrs.v,
					vrs.r,
					vrs.s
				]).data
			).data
		);
	}

	public getTransactionForMulti(): MultisigTransaction {
		throw Error("Cannot include setStateWithSigningKeys inside MultiSend");
	}
}

export class CfAppUpdateAsOwner extends CfOperation {
	constructor(
		readonly multisigAddress: string,
		readonly cfaddress: string,
		readonly appState: string,
		readonly nonce: number
	) {
		super();
	}

	public getHashToSign(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "address", "uint256", "bytes", "uint256"],
			[
				"0x19",
				this.multisigAddress,
				REGISTRY_ADDRESS,
				0,
				this.getTransactionForMulti().data,
				Operation.Delegatecall
			]
		);
	}

	public getTransaction(): Transaction {
		const signature = Signature.toVRSObject(this.getSignatures());
		return new Transaction(
			this.multisigAddress,
			0,
			new ethers.Interface([
				Interfaces.ExecTransaction
			]).functions.execTransaction(
				REGISTRY_ADDRESS,
				0,
				this.getTransactionForMulti().data,
				Operation.Delegatecall,
				signature.v,
				signature.r,
				signature.s
			).data
		);
	}

	public getTransactionForMulti(): MultisigTransaction {
		return new MultisigTransaction(
			REGISTRY_ADDRESS,
			0,
			new ethers.Interface([Interfaces.ProxyCall]).functions.proxyCall(
				REGISTRY_ADDRESS,
				this.cfaddress,
				new ethers.Interface([
					Interfaces.SetStateAsOwner
				]).functions.setStateAsOwner(this.appState, this.nonce).data
			).data,
			Operation.Delegatecall
		);
	}
}

export class CfAppInstall extends CfOperation {
	constructor(readonly multisigAddress: string, readonly app: App) {
		super();
	}

	public getHashToSign(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "address", "uint256", "bytes", "uint256"],
			[
				"0x19",
				this.multisigAddress,
				REGISTRY_ADDRESS,
				0,
				this.getTransactionForMulti().data,
				Operation.Delegatecall
			]
		);
	}

	public getTransaction(): Transaction {
		const tx = this.getTransactionForMulti();
		return new Transaction(
			this.multisigAddress,
			0,
			new ethers.Interface([
				Interfaces.ExecTransaction
			]).functions.execTransaction(
				tx.to,
				tx.value,
				tx.data,
				tx.operation,
				Signature.toVRSObject(this.getSignatures())
			).data
		);
	}

	public getTransactionForMulti(): MultisigTransaction {
		return new MultisigTransaction(
			CONDITIONAL_TRANSFER_ADDRESS,
			0,
			new ethers.Interface([
				Interfaces.MakeConditionalTransfer
			]).functions.makeConditionalTransfer(
				this.app.conditions.map(x => x.toJson()),
				{
					dest: this.app.appAddress.toJson(),
					selector: "0xb5d78d8c"
				},
				this.app.pipeline.map(x => x.toJson()),
				this.app.payoutFunction.toJson()
			).data,
			Operation.Delegatecall
		);
	}
}

export class CFMultiOp extends CfOperation {
	constructor(
		readonly cfoperations: Array<CfOperation>,
		readonly multisigAddress: string
	) {
		super();
	}

	public getHashToSign(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "address", "uint256", "bytes", "uint256"],
			[
				"0x19",
				this.multisigAddress,
				MULTISEND_CONTRACT_ADDRESS,
				0,
				this.getTransaction().data,
				Operation.Delegatecall
			]
		);
	}

	public getTransaction(): Transaction {
		const transactions: Array<MultisigTransaction> = [];
		for (let i = 0; i < this.cfoperations.length; i++) {
			transactions.push(this.cfoperations[i].getTransactionForMulti());
		}
		const multisend = new MultiSend(transactions).getTransaction();
		return new Transaction(
			this.multisigAddress,
			0,
			new ethers.Interface([
				Interfaces.ExecTransaction
			]).functions.execTransaction(
				multisend.to,
				multisend.value,
				multisend.data,
				multisend.operation,
				//Signature.toVRSObject(this.getSignatures())
				[], // fix me
				[], // fix me
				[] // fix me
			).data
		);
	}

	public getTransactionForMulti(): MultisigTransaction {
		throw Error("Recursive MultiSends not supported yet");
	}
}
