import { NetworkContext, Address, Signature, Bytes } from "../../types";
import * as ethers from "ethers";
import {
	Abi,
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
import Multisig from "../../../contracts/build/contracts/MinimumViableMultisig.json";

export abstract class CfMultiSendOp extends CfOperation {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly cfFreeBalance: CfFreeBalance,
		readonly dependencyNonce: CfNonce
	) {
		super();
	}

	transaction(sigs: Signature[]): Transaction {
		let multisigInput = this.multisigInput();
		const txData = new ethers.Interface(
			Multisig.abi
		).functions.execTransaction.encode([
			multisigInput.to,
			multisigInput.val,
			multisigInput.data,
			multisigInput.op,
			Signature.toBytes(sigs)
		]);
		return new Transaction(this.multisig, 0, txData);
	}

	hashToSign(): string {
		let multisigInput = this.multisigInput();
		return ethers.utils.solidityKeccak256(
			["bytes1", "address[]", "address", "uint256", "bytes", "uint256"],
			[
				"0x19",
				[this.cfFreeBalance.alice, this.cfFreeBalance.bob],
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
		let op = Operation.Delegatecall;
		return new MultisigInput(to, val, data, op);
	}

	freeBalanceData(): Bytes {
		let terms = CfFreeBalance.terms();
		let app = CfFreeBalance.contractInterface(this.ctx);
		let freeBalanceCfAddress = new CfStateChannel(
			this.ctx,
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
				this.cfFreeBalance.aliceBalance.toString(),
				this.cfFreeBalance.bobBalance.toString()
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

	finalizeDependencyNonceInput(): MultisigInput {
		let to = this.ctx.NonceRegistry;
		let val = 0;
		let data = new ethers.Interface([
			Abi.finalizeNonce
		]).functions.finalizeNonce.encode([this.dependencyNonce.salt]);
		let op = Operation.Call;
		return new MultisigInput(to, val, data, op);
	}

	abstract eachMultisigInput(): Array<MultisigInput>;
}
