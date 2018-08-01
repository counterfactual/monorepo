import * as ethers from "ethers";
import { NetworkContext, Address, H256 } from "../types";
import {
	Operation,
	Abi,
	MultisigInput,
	Terms,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "./types";
import { CfMultiSendOp } from "./cf-multisend-op";
import * as common from "./common";

export class CfOpInstall extends CfMultiSendOp {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly app: CfStateChannel,
		readonly cfFreeBalance: CfFreeBalance,
		readonly dependencyNonce: CfNonce
	) {
		super();
	}

	/**
	 * @override common.CfMultiSendOp
	 */
	eachMultisigInput(): Array<MultisigInput> {
		return [
			this.freeBalanceInput(),
			this.dependencyNonceInput(),
			this.conditionalTransferInput()
		];
	}

	private conditionalTransferInput(): MultisigInput {
		let to = this.ctx.ConditionalTransfer;
		let val = 0;
		let terms = [
			this.app.terms.assetType,
			this.app.terms.limit,
			this.app.terms.token
		];
		let data = new ethers.Interface([
			Abi.executeStateChannelConditionalTransfer
		]).functions.executeStateChannelConditionalTransfer.encode([
			this.dependencyNonce.salt,
			this.dependencyNonce.nonce,
			this.appCfAddress,
			terms
		]);
		let op = Operation.Delegatecall;
		return new MultisigInput(to, val, data, op);
	}

	get appCfAddress(): H256 {
		return this.app.cfAddress();
	}
}
