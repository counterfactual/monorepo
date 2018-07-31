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
	readonly ctx: NetworkContext = Object.create(null);
	readonly multisig: Address = Object.create(null);
	readonly signingKeys: Address[] = Object.create(null);
	readonly timeout: number = Object.create(null);
	readonly freeBalanceUniqueId: number = Object.create(null);
	readonly alice: Address = Object.create(null);
	readonly aliceFreeBalance: number = Object.create(null);
	readonly bob: Address = Object.create(null);
	readonly bobFreeBalance: number = Object.create(null);
	readonly freeBalanceLocalNonce: number = Object.create(null);
	readonly dependencyNonceSalt: string = Object.create(null);
	readonly dependencyNonceNonce: number = Object.create(null);

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
