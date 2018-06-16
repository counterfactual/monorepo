const ethers = require("ethers");
const assert = require("assert");

const unusedAddr = "0x0000000000000000000000000000000000000001";
const zeroAddress = "0x0000000000000000000000000000000000000000";
const zeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

function signMessage (message, wallet) {
	const signingKey = new ethers.SigningKey(wallet.privateKey);
	const sig = signingKey.signDigest(message);
	return [sig.recoveryParam + 27, sig.r, sig.s];
}

function signMessageVRS (message, wallets) {
	const [v, r, s] = [[], [], []];
	for (let i = 0; i < wallets.length; i++) {
		const [vi, ri, si] = signMessage(message, wallets[i]);
		v.push(vi);
		r.push(ri);
		s.push(si);
	}
	return {v, r, s};
}

function getParamFromTxEvent(transaction, eventName, paramName, contract, contractFactory) {
	let logs = transaction.logs;
	if(eventName != null) {
		logs = logs.filter((l) => l.event === eventName && l.address === contract);
	}
	assert.equal(logs.length, 1, "too many logs found!");
	let param = logs[0].args[paramName];
	if(contractFactory != null) {
		let contract = contractFactory.at(param);
		return contract;
	} else {
		return param;
	}
}

async function assertRejects(q, msg) {
	let res, catchFlag = false;
	try {
		res = await q;
	} catch(e) {
		catchFlag = true;
	} finally {
		if(!catchFlag)
			assert.fail(res, null, msg);
	}
}

const evm_mine_one = function () {
	return new Promise((resolve, reject) => {
		web3.currentProvider.sendAsync({
			jsonrpc: "2.0",
			method: "evm_mine",
			id: new Date().getTime()
		}, (err, result) => {
			if(err){ return reject(err); }
			return resolve(result);
		});
	});
};

const evm_mine = async (blocks) => {
	for (var i=0; i<blocks; i++) await evm_mine_one();
};

async function getEthBalance(address, provider) {
	let balance = await provider.getBalance(address);
	return fromWei(balance);
}

function fromWei(num) {
	return num / 1000000000000000000;
}

async function sendEth(toAddr, amount, signer, provider) {
	let tx = {
		to: toAddr,
		value: ethers.utils.parseEther(amount),
		gasLimit: 4712388,
		gasPrice: await provider.getGasPrice(),
	};
	await signer.sendTransaction(tx);
}

async function deployContract(contract, args, signer, provider) {
	let deployTx = ethers.Contract.getDeployTransaction(
		contract.binary,
		contract.abi,
		...args
	);

	const tx = await signer.sendTransaction({
		gasLimit: 4712388,
		gasPrice: await provider.getGasPrice(),
		...deployTx
	});

	const addr = ethers.utils.getContractAddress(tx);
	return new ethers.Contract(
		addr,
		contract.abi,
		signer
	);
}

const defaultObjectStorage = ({owner, registry}) => ({
	owner,
	registry,
	id: 1337,
	deltaTimeout: 10,
	finalizesAt: 0,
	latestNonce: 0,
	wasDeclaredFinal: false,
});

module.exports = {
	signMessage,
	signMessageVRS,
	unusedAddr,
	zeroAddress,
	zeroBytes32,
	getParamFromTxEvent,
	assertRejects,
	evm_mine,
	getEthBalance,
	sendEth,
	deployContract,
	defaultObjectStorage,
};
