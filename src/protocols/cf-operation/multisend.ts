import * as ethers from "ethers";
import { MultisigTransaction, Operation } from "./types";

const MULTISEND_CONTRACT_ADDRESS = "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4";

export class MultiSend {
	constructor(readonly transactions: Array<MultisigTransaction>) {}

	public getTransaction(): MultisigTransaction {
		let txs: string = "0x";
		for (let i = 0; i < this.transactions.length; i++) {
			txs += ethers.utils.AbiCoder.defaultCoder
				.encode(
					["tuple(uint256,address,uint256,bytes)"],
					[
						[
							this.transactions[i].operation,
							this.transactions[i].to,
							this.transactions[i].value,
							this.transactions[i].data
						]
					]
				)
				.substr(2);
		}
		return new MultisigTransaction(
			MULTISEND_CONTRACT_ADDRESS,
			0,
			txs,
			Operation.Delegatecall
		);
	}
}
