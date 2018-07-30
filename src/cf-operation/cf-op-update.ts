import * as ethers from "ethers";
import * as common from "./common";
import { CfApp, Terms, Transaction, CfOperation, Operation } from "./types";
import { NetworkContext, Address, Signature } from "../types";

export class CfOpUpdate extends CfOperation {
	constructor(
		readonly ctx: NetworkContext,
		readonly multisig: Address,
		readonly signingKeys: Address[],
		// VM doesn't know about app contracts for now (must be passed via RPC)
		readonly appStateHash: string,
		readonly appUniqueId: number,
		readonly terms: Terms,
		readonly app: CfApp,
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
		let appCfAddr = common.appCfAddress(
			this.ctx,
			this.multisig,
			this.signingKeys,
			this.timeout,
			this.appUniqueId,
			this.terms,
			this.app
		);

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
		return null;
	}
}
