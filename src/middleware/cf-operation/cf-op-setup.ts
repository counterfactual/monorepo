import { FreeBalance, NetworkContext, Signature, H256 } from "../../types";
import {
	Operation,
	Transaction,
	MultisigInput,
	Abi,
	Terms,
	zeroAddress,
	zeroBytes32,
	CfOperation,
	CfNonce,
	CfStateChannel
} from "./types";
import * as ethers from "ethers";
import * as common from "./common";

export class CfOpSetup extends CfOperation {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: string,
		readonly freeBalance: CfStateChannel,
		readonly nonce: CfNonce
	) {
		super();
	}

	hashToSign(): H256 {
		let multisigInput = this.multisigInput();
		return ethers.utils.solidityKeccak256(
			["bytes1", "address", "address", "uint256", "bytes", "uint256"],
			[
				"0x19",
				this.multisig, // why did we use this as salt in the last iteration?
				multisigInput.to,
				multisigInput.val,
				multisigInput.data,
				multisigInput.op
			]
		);
	}

	multisigInput(): MultisigInput {
		let termsArray = [
			this.freeBalance.terms.assetType,
			this.freeBalance.terms.limit,
			this.freeBalance.terms.token
		];
		let multisigCalldata = new ethers.Interface([
			Abi.executeStateChannelConditionalTransfer
		]).functions.executeStateChannelConditionalTransfer.encode([
			this.ctx.Registry,
			this.ctx.NonceRegistry,
			this.nonce.salt,
			this.nonce.nonce,
			this.freeBalance.cfAddress(),
			termsArray
		]);

		return new MultisigInput(
			this.ctx.ConditionalTransfer,
			0,
			multisigCalldata,
			Operation.Delegatecall
		);
	}

	transaction(sigs: Signature[]): Transaction {
		let msInput = this.multisigInput();
		return new Transaction(
			this.multisig,
			0,
			new ethers.Interface([
				Abi.execTransaction
			]).functions.execTransaction.encode([
				msInput.to,
				msInput.val,
				msInput.data,
				msInput.op,
				Signature.toBytes(sigs)
			])
		);
	}
}
