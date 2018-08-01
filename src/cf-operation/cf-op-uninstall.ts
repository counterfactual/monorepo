import * as ethers from "ethers";
import * as common from "./common";
import { NetworkContext, Bytes, Signature, Address } from "../types";
import { MultisigInput, CfFreeBalance, CfNonce } from "./types";
import { CfMultiSendOp } from "./cf-multisend-op";

export class CfOpUninstall extends CfMultiSendOp {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly cfFreeBalance: CfFreeBalance,
		readonly dependencyNonce: CfNonce
	) {
		super();
	}

	/**
	 * @override common.CfMultiSendOp
	 */
	eachMultisigInput(): Array<MultisigInput> {
		return [this.freeBalanceInput(), this.dependencyNonceInput()];
	}
}
