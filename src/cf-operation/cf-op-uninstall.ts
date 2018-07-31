import * as ethers from "ethers";
import * as common from "./common";
import { NetworkContext, Bytes, Signature, Address } from "../types";
import { MultisigInput } from "./types";
import { CfMultiSendOp } from "./cf-multisend-op";

export class CfOpUninstall extends CfMultiSendOp {
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

	/**
	 * @override common.CfMultiSendOp
	 */
	eachMultisigInput(): Array<MultisigInput> {
		return [this.freeBalance(), this.dependencyNonce()];
	}
}
