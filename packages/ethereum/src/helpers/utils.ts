import { assert } from "chai";
import ethers = require("ethers");

export const unusedAddr = "0x0000000000000000000000000000000000000001";
export const zeroAddress = "0x0000000000000000000000000000000000000000";
export const zeroBytes32 =
	"0x0000000000000000000000000000000000000000000000000000000000000000";

export function signMessage(message, wallet): [number, string, string] {
	const signingKey = new ethers.SigningKey(wallet.privateKey);
	const sig = signingKey.signDigest(message);
	return [sig.recoveryParam + 27, sig.r, sig.s];
}

export function signMessageVRS(message, wallets: ethers.Wallet[]) {
	const v: number[] = [];
	const r: string[] = [];
	const s: string[] = [];
	for (const wallet of wallets) {
		const [vi, ri, si] = signMessage(message, wallet);
		v.push(vi);
		r.push(ri);
		s.push(si);
	}
	return { v, r, s };
}

export function getParamFromTxEvent(
	transaction,
	eventName,
	paramName,
	contract,
	contractFactory
) {
	let logs = transaction.logs;
	if (eventName != null) {
		logs = logs.filter(l => l.event === eventName && l.address === contract);
	}
	assert.equal(logs.length, 1, "too many logs found!");
	const param = logs[0].args[paramName];
	if (contractFactory != null) {
		return contractFactory.at(param);
	} else {
		return param;
	}
}

export async function assertRejects(q, msg) {
	let res;
	let catchFlag = false;
	try {
		res = await q;
	} catch (e) {
		catchFlag = true;
	} finally {
		if (!catchFlag) {
			assert.fail(res, null, msg);
		}
	}
}

export const mineOneBlock = () => {
	const web3 = (global as any).web3;
	return new Promise((resolve, reject) => {
		web3.currentProvider.sendAsync(
			{
				id: new Date().getTime(),
				jsonrpc: "2.0",
				method: "evm_mine",
				params: []
			},
			(err, result) => {
				if (err) {
					return reject(err);
				}
				return resolve(result);
			}
		);
	});
};

export const mineBlocks = async blocks => {
	for (let i = 0; i < blocks; i++) {
		await mineOneBlock();
	}
};

export async function getEthBalance(address, provider) {
	const balance = await provider.getBalance(address);
	return fromWei(balance);
}

export function fromWei(num) {
	return num / 1000000000000000000;
}

export async function sendEth(toAddr, amount, signer, provider) {
	const tx = {
		gasLimit: 4712388,
		gasPrice: await provider.getGasPrice(),
		to: toAddr,
		value: ethers.utils.parseEther(amount)
	};
	await signer.sendTransaction(tx);
}

export async function deployContract(contract, args, signer, provider) {
	const deployTx = new ethers.Interface(contract.abi).deployFunction.encode(
		contract.binary,
		args
	);

	const tx = await signer.sendTransaction({
		data: deployTx,
		gasLimit: 4712388,
		gasPrice: await provider.getGasPrice()
	});

	const addr = ethers.utils.getContractAddress(tx);
	return new ethers.Contract(addr, contract.abi, signer);
}

export const defaultObjectStorage = ({ owner, registry }) => ({
	deltaTimeout: 10,
	finalizesAt: 0,
	id: 1337,
	latestNonce: 0,
	owner,
	registry,
	wasDeclaredFinal: false
});
