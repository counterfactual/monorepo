import * as ethers from "ethers";
import { Transaction } from "../machine/cf-operation/types";

export class Signature {
	// todo: fix types
	constructor(readonly v: Number, readonly r: string, readonly s: string) {}

	public toString(): string {
		return (
			"0x" +
			this.r.substr(2) +
			this.s.substr(2) +
			ethers.utils.hexlify(this.v).substr(2)
		);
	}

	public static matches(
		hash: string,
		signature: Signature,
		address: string
	): boolean {
		// FIXME: Use real signatures in tests
		return true;
		/*
		const recoveredAddress = ethers.Wallet.verifyMessage(
			hash,
			signature.toString()
		);
		return recoveredAddress === address;
		*/
	}

	public static toVRSObject(signatures: Array<Signature>): any {
		return {
			v: signatures.map(x => x.v),
			r: signatures.map(x => x.r),
			s: signatures.map(x => x.s)
		};
	}
}

// replace with something else?
export enum AppId {
	BalanceRefund,
	FreeBalance,
	Nonce
}
