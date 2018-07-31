import { NetworkContext, Address, Signature } from "../types";
import * as ethers from "ethers";
import {
	CfApp,
	Abi,
	Terms,
	zeroBytes32,
	zeroAddress,
	Transaction,
	CfOperation,
	MultisigInput,
	MultiSend,
	Operation
} from "./types";
import * as common from "./common";

export abstract class CfMultiSendOp extends CfOperation {
	readonly ctx: NetworkContext;
	readonly multisig: Address;
	readonly signingKeys: Address[];
	readonly timeout: number;
	readonly freeBalanceUniqueId: number;
	readonly alice: Address;
	readonly aliceFreeBalance: number;
	readonly bob: Address;
	readonly bobFreeBalance: number;
	readonly freeBalanceLocalNonce: number;
	readonly dependencyNonceSalt: string;
	readonly dependencyNonceNonce: number;

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

	/**
	 * @returns the input for the transaction from the multisig that will trigger
	 *          a multisend transaction.
	 */
	private multisigInput(): MultisigInput {
		return new MultiSend(this.eachMultisigInput()).input(this.ctx.MultiSend);
	}

	freeBalance(): MultisigInput {
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

	dependencyNonce(): MultisigInput {
		let to = this.ctx.NonceRegistry;
		let val = 0;
		let data = new ethers.Interface([Abi.setNonce]).functions.setNonce.encode([
			this.dependencyNonceSalt,
			this.dependencyNonceNonce
		]);
		let op = Operation.Call;
		return new MultisigInput(to, val, data, op);
	}

	abstract eachMultisigInput(): Array<MultisigInput>;
}
