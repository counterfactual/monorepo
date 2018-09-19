import { Address, H256, NetworkContext } from "../../types";
import {
	Abi,
	CfFreeBalance,
	CfNonce,
	CfStateChannel,
	MultisigInput,
	Operation
} from "./types";
import * as ethers from "ethers";
import { BigNumber } from "ethers";

import { CfMultiSendOp } from "./cf-multisend-op";

const TYPES = ["bytes1", "address", "address", "uint256", "bytes", "uint256"];

export class CfOpSetup extends CfMultiSendOp {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly freeBalanceStateChannel: CfStateChannel,
		readonly freeBalance: CfFreeBalance,
		readonly nonce: CfNonce
	) {
		super(ctx, multisig, freeBalance, nonce);
	}

	/**
	 * Helper method to get hash of an input calldata
	 * @param multisig
	 * @param multisigInput
	 */
	static toHash(multisig: Address, multisigInput: MultisigInput): H256 {
		multisigInput = sanitizeMultisigInput(multisigInput);
		return ethers.utils.solidityKeccak256(TYPES, [
			"0x19",
			multisig, // why did we use this as salt in the last iteration?
			multisigInput.to,
			multisigInput.val,
			multisigInput.data,
			multisigInput.op
		]);
	}

	/**
	 * @override common.CfMultiSendOp
	 */
	eachMultisigInput(): Array<MultisigInput> {
		return [
			this.dependencyNonceInput(),
			this.finalizeDependencyNonceInput(),
			this.conditionalTransferInput()
		];
	}

	conditionalTransferInput(): MultisigInput {
		let terms = CfFreeBalance.terms();

		const depNonceKey = ethers.utils.solidityKeccak256(
			["address", "uint256"],
			[this.multisig, this.dependencyNonce.salt]
		);

		let multisigCalldata = new ethers.Interface([
			Abi.executeStateChannelConditionalTransfer
		]).functions.executeStateChannelConditionalTransfer.encode([
			this.ctx.Registry,
			this.ctx.NonceRegistry,
			depNonceKey,
			this.dependencyNonce.nonce,
			this.freeBalanceStateChannel.cfAddress(),
			[terms.assetType, terms.limit, terms.token]
		]);

		return new MultisigInput(
			this.ctx.ConditionalTransfer,
			0,
			multisigCalldata,
			Operation.Delegatecall
		);
	}
}

function sanitizeMultisigInput(multisigInput: any): MultisigInput {
	return new MultisigInput(
		multisigInput.to,
		new BigNumber(multisigInput.value).toNumber(),
		multisigInput.data,
		new BigNumber(multisigInput.operation).toNumber()
	);
}
