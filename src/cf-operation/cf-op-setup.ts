import { FreeBalance, NetworkContext, Signature } from "../types";
import {
	Operation,
	Transaction,
	MultisigInput,
	Abi,
	CfApp,
	Terms,
	zeroAddress,
	zeroBytes32,
	CfOperation
} from "./types";
import * as ethers from "ethers";
import * as common from "./common";

export class CfOpSetup extends CfOperation {
	/**
	 * nonceRegistryKey should be the unique identifier for a particular
	 * dependency nonces on a single app. It can simply be a unique counter
	 * on the number off apps in a given state channel container represented
	 * by a single multisig.
	 */
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: string,
		readonly signingKeys: string[], // must be alphabetically ordered
		readonly freeBalanceUniqueId: number,
		readonly nonceRegistryKey: string,
		readonly nonceRegistryNonce: number,
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
				this.multisig, // why did we use this as salt in the last iteration?
				multisigInput.to,
				multisigInput.val,
				multisigInput.data,
				multisigInput.op
			]
		);
	}

	multisigInput(): MultisigInput {
		let [terms, app] = common.freeBalance(this.ctx);
		let freeBalanceCfAddr = common.appCfAddress(
			this.ctx,
			this.multisig,
			this.signingKeys,
			this.timeout,
			this.freeBalanceUniqueId,
			terms,
			app
		);
		let termsArray = [terms.assetType, terms.limit, terms.token];
		let multisigCalldata = new ethers.Interface([
			Abi.executeStateChannelConditionalTransfer
		]).functions.executeStateChannelConditionalTransfer.encode([
			this.nonceRegistryKey,
			this.nonceRegistryNonce,
			freeBalanceCfAddr,
			termsArray
		]);

		return new MultisigInput(
			this.ctx.ConditionalTransfer,
			0,
			multisigCalldata,
			Operation.Delegatecall
		);
	}

	// CHANGE: we should put a hash on the Transaction instead of a hash
	//        on the cfoperation itself.
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
