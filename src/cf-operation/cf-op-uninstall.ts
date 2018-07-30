import * as ethers from "ethers";
import * as common from "./common";
import { NetworkContext, Bytes, Signature, Address } from "../types";
import {
	Transaction,
	Abi,
	MultisigInput,
	MultiSend,
	Operation,
	zeroAddress,
	CfOperation
} from "./types";

// TODO: everything in this can be shared with cf-op-install except the
//       specification of the multisend
export class CfOpUninstall extends CfOperation {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly signingKeys: Address[],
		readonly freeBalanceUniqueId: number,
		readonly freeBalanceLocalNonce: number,
		readonly alice: Address, // first person in free balance object
		readonly aliceFreeBalance: number,
		readonly bob: Address, // second person in free balance object
		readonly bobFreeBalance: number,
		readonly dependencyNonceSalt: string,
		readonly dependencyNonceNonce: number,
		readonly timeout: number
	) {
		super();
	}

	hashToSign(): string {
		let multisigInput = this.multisigInput();
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "address", "uint256", "bytes", "uint256"],
			[
				"0x19",
				this.multisig,
				multisigInput.to,
				multisigInput.val,
				multisigInput.data,
				multisigInput.op
			]
		);
	}

	// exact same as cf-op-install
	transaction(sigs: Signature[]): Transaction {
		let multisigInput = this.multisigInput();
		return new Transaction(
			this.multisig,
			0,
			new ethers.Interface([
				Abi.execTransaction
			]).functions.execTransaction.encode([
				multisigInput.to,
				multisigInput.val,
				multisigInput.data,
				multisigInput.op,
				Signature.toBytes(sigs)
			])
		);
	}
	/**
	 * @returns the input for the transaction from the multisig that will trigger
	 *          a multisend transaction.
	 */
	// exact same as cf-op-install
	private multisigInput(): MultisigInput {
		return new MultiSend(this.eachMultisigInput()).input(this.ctx.MultiSend);
	}

	/**
	 * @returns the inputs for each transacton in the multisend transaction
	 *          representing this install.
	 */
	// exact same as cf-op-install
	private eachMultisigInput(): Array<MultisigInput> {
		return [this.freeBalance(), this.dependencyNonce()];
	}

	// exact same as cf-op-install
	private freeBalance(): MultisigInput {
		let to = this.ctx.Registry;
		let val = 0;
		let data = common.freeBalanceData(
			this.ctx,
			this.multisig,
			this.signingKeys,
			this.timeout,
			this.freeBalanceUniqueId,
			this.alice,
			this.aliceFreeBalance,
			this.bob,
			this.bobFreeBalance,
			this.freeBalanceLocalNonce
		);
		let op = Operation.Call;
		return new MultisigInput(to, val, data, op);
	}

	// exact same as cf-op-install
	private dependencyNonce(): MultisigInput {
		let to = this.ctx.NonceRegistry;
		let val = 0;
		let data = new ethers.Interface([Abi.setNonce]).functions.setNonce.encode([
			this.dependencyNonceSalt,
			this.dependencyNonceNonce
		]);
		let op = Operation.Call;
		return new MultisigInput(to, val, data, op);
	}
}
