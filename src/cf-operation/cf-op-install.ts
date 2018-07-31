import * as ethers from "ethers";
import {
	Signature,
	NetworkContext,
	FreeBalance,
	PeerBalance,
	Bytes,
	Address
} from "../types";
import { Transaction } from "./types";
import {
	Operation,
	Abi,
	MultiSend,
	MultiSendInput,
	MultisigInput,
	Terms,
	CfApp,
	zeroAddress
} from "./types";
import * as common from "./common";
import { CfOperation } from "./types";

export class CfOpInstall extends CfOperation {
	appCfAddress: Address;
	// todo: abstract these items that must be passed in from the executing
	//       vm keeping track of all these things
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly appUniqueId: number,
		readonly signingKeys: Address[],
		readonly freeBalanceUniqueId: number,
		readonly freeBalanceLocalNonce: number,
		readonly alice: Address, // first person in free balance object
		readonly aliceFreeBalance: number,
		readonly bob: Address, // second person in free balance object
		readonly bobFreeBalance: number,
		readonly dependencyNonceSalt: string,
		readonly dependencyNonceNonce: number,
		readonly terms: Terms,
		readonly app: CfApp,
		readonly timeout: number
	) {
		super();
	}

	// note: this is exact same code as cf-op-setup;...lets share this
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

	/**
	 * @returns the inputs for each transacton in the multisend transaction
	 *          representing this install.
	 */
	private eachMultisigInput(): Array<MultisigInput> {
		return [
			this.freeBalance(),
			this.dependencyNonce(),
			this.conditionalTransfer()
		];
	}

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

	private conditionalTransfer(): MultisigInput {
		let appCfAddr = common.appCfAddress(
			this.ctx,
			this.multisig,
			this.signingKeys,
			this.timeout,
			this.appUniqueId,
			this.terms,
			this.app
		);
		this.appCfAddress = appCfAddr;
		let to = this.ctx.ConditionalTransfer;
		let val = 0;
		let terms = [this.terms.assetType, this.terms.limit, this.terms.token];
		let data = new ethers.Interface([
			Abi.executeStateChannelConditionalTransfer
		]).functions.executeStateChannelConditionalTransfer.encode([
			this.dependencyNonceSalt,
			this.dependencyNonceNonce,
			appCfAddr,
			terms
		]);
		let op = Operation.Delegatecall;
		return new MultisigInput(to, val, data, op);
	}

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
}
