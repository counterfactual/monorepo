import * as ethers from "ethers";
import * as common from "./common";
import {
	CfAppInterface,
	Terms,
	Transaction,
	CfOperation,
	CfStateChannel
} from "./types";
import { NetworkContext, Address, Signature } from "../types";

export class CfOpUpdate extends CfOperation {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly signingKeys: Address[],
		readonly appStateHash: string,
		readonly appUniqueId: number,
		readonly terms: Terms,
		readonly app: CfAppInterface,
		readonly appLocalNonce: number,
		readonly timeout: number
	) {
		super();
	}

	hashToSign(): string {
		return ethers.utils.solidityKeccak256(
			["bytes1", "address[]", "uint256", "uint256", "bytes32"],
			[
				"0x19",
				this.signingKeys,
				this.appLocalNonce,
				this.timeout,
				this.appStateHash
			]
		);
	}

	/**
	 * @returns a tx that executes a proxyCall through the registry to call
	 *          `setState` on StateChannel.sol.
	 */
	transaction(sigs: Signature[]): Transaction {
		let appCfAddr = new CfStateChannel(
			this.multisig,
			this.signingKeys,
			this.app,
			this.terms,
			this.timeout,
			this.appUniqueId
		).cfAddress();
		let to = this.ctx.Registry;
		let val = 0;
		let data = common.proxyCallSetStateData(
			this.appStateHash,
			appCfAddr,
			this.appLocalNonce,
			this.timeout,
			Signature.toBytes(sigs),
			this.ctx.Registry
		);
		return new Transaction(to, val, data);
	}

	// not slated for this sprint, since we are only focusing on unanimous consent
	// and not unilateral moves
	disputeWithUnilateralAction(sig: Signature): Transaction {
		// todo
		return Object.create(Transaction);
	}
}
