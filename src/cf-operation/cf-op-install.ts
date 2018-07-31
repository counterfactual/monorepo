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
	zeroAddress,
	CfOperation
} from "./types";
import { CfMultiSendOp } from "./cf-multisend-op";
import * as common from "./common";

export class CfOpInstall extends CfMultiSendOp {
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

	/**
	 * @overrid common.CfMultiSendOp
	 */
	eachMultisigInput(): Array<MultisigInput> {
		return [
			this.freeBalance(),
			this.dependencyNonce(),
			this.conditionalTransfer()
		];
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
}
