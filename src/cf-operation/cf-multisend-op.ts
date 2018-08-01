import { NetworkContext, Address, Signature, Bytes } from "../types";
import * as ethers from "ethers";
import {
	Abi,
	Terms,
	zeroBytes32,
	zeroAddress,
	Transaction,
	CfOperation,
	MultisigInput,
	MultiSend,
	Operation,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "./types";
import * as common from "./common";

export abstract class CfMultiSendOp extends CfOperation {
	readonly ctx: NetworkContext = Object.create(null);
	readonly multisig: Address = Object.create(null);
	readonly dependencyNonce: CfNonce = Object.create(null);
	readonly cfFreeBalance: CfFreeBalance = Object.create(null);

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

	freeBalanceInput(): MultisigInput {
		let to = this.ctx.Registry;
		let val = 0;
		let data = this.freeBalanceData();
		let op = Operation.Call;
		return new MultisigInput(to, val, data, op);
	}

	freeBalanceData(): Bytes {
		let terms = CfFreeBalance.terms();
		let app = CfFreeBalance.contractInterface(this.ctx);
		let freeBalanceCfAddress = new CfStateChannel(
			this.multisig,
			[this.cfFreeBalance.alice, this.cfFreeBalance.bob],
			app,
			terms,
			this.cfFreeBalance.timeout,
			this.cfFreeBalance.uniqueId
		).cfAddress();

		let appStateHash = ethers.utils.solidityKeccak256(
			["bytes1", "address", "address", "uint256", "uint256"],
			[
				"0x19",
				this.cfFreeBalance.alice,
				this.cfFreeBalance.bob,
				this.cfFreeBalance.aliceBalance,
				this.cfFreeBalance.bobBalance
			]
		);
		// don't need signatures since the multisig is the owner
		let signatures = "0x0";
		return common.proxyCallSetStateData(
			appStateHash,
			freeBalanceCfAddress,
			this.cfFreeBalance.localNonce,
			this.cfFreeBalance.timeout,
			signatures,
			this.ctx.Registry
		);
	}

	dependencyNonceInput(): MultisigInput {
		let to = this.ctx.NonceRegistry;
		let val = 0;
		let data = new ethers.Interface([Abi.setNonce]).functions.setNonce.encode([
			this.dependencyNonce.salt,
			this.dependencyNonce.nonce
		]);
		let op = Operation.Call;
		return new MultisigInput(to, val, data, op);
	}

	abstract eachMultisigInput(): Array<MultisigInput>;
}
