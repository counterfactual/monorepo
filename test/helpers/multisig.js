const ethers = require("ethers");

let Operation = Object.freeze({
	Call: 0,
	Delegatecall: 1,
	Create: 2,
});

/**
 * Executes a transaction from the multisig to itself according to
 * to the given data.
 *
 * @param data is the contract abi to invoke the correct function with args.
 * @param multisig is the multisig sending and receiving the tx.
 * @param wallets is the array of wallets signing off on the tx.
 * @param op is the Operation to use, i.e., Call, Delegatecall, or Create.
 */
async function executeTxData(data, toAddr, multisig, wallets, op) {
	let value = 0;

	let transactionHash = await multisig.getTransactionHash(
		toAddr,
		value,
		data,
		op
	);

	let signatures = sign(transactionHash, wallets);
	return await multisig.execTransaction(
		toAddr,
		value,
		data,
		op,
		signatures.v,
		signatures.r,
		signatures.s,
		{
			gasLimit: 4712388,
		}
	);
}

function sign(data, wallets) {
	let sortedWallets = wallets.slice().sort((w1, w2) => {
		return w1.address < w2.address ? -1 : (
			(w1.address == w2.address) ? 0 : 1
		);
	});
	let sortedSigs = {
		v: [],
		r: [],
		s: [],
	};
	sortedWallets.forEach((wallet) => {
		let sig = new ethers.SigningKey(wallet.privateKey).signDigest(data);
		sortedSigs.v.push(sig.recoveryParam + 27);
		sortedSigs.r.push(sig.r);
		sortedSigs.s.push(sig.s);
	});

	return sortedSigs;
}

module.exports = {
	executeTxData,
	Operation
};
