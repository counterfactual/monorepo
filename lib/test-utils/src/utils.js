"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const chaiBigNumber = require("chai-bignumber");
const chaiString = require("chai-string");
const ethers = require("ethers");
ethers.BigNumber.prototype.equals = function (x) {
    return x.eq(this);
};
exports.should = chai
    .use(chaiAsPromised)
    .use(chaiString)
    .use(chaiBigNumber(null))
    .should();
exports.UNIT_ETH = ethers.utils.parseEther("1");
exports.HIGH_GAS_LIMIT = { gasLimit: 6e9 };
exports.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
exports.ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
exports.deployContract = async (contract, providerOrSigner, args) => {
    return new ethers.Contract("", contract.abi, providerOrSigner).deploy(contract.binary, ...(args || []));
};
let runningTally = 0;
async function deployContractViaRegistry(truffleContract, providerOrSigner, cargs) {
    const Registry = artifacts.require("Registry");
    const registry = await exports.getDeployedContract(Registry, providerOrSigner);
    const initcode = new ethers.Interface(truffleContract.abi).deployFunction.encode(truffleContract.binary, cargs || []);
    const contractSalt = ethers.utils.solidityKeccak256(["uint256"], [runningTally++]);
    const cfAddr = ethers.utils.solidityKeccak256(["bytes1", "bytes", "uint256"], ["0x19", initcode, contractSalt]);
    await registry.functions.deploy(initcode, contractSalt, exports.HIGH_GAS_LIMIT);
    const realAddr = await registry.functions.resolver(cfAddr);
    const contract = new ethers.Contract(realAddr, truffleContract.abi, providerOrSigner);
    return { cfAddr, contract };
}
exports.deployContractViaRegistry = deployContractViaRegistry;
exports.getDeployedContract = async (contract, providerOrSigner) => {
    return new ethers.Contract((await contract.deployed()).address, contract.abi, providerOrSigner);
};
exports.randomETHAddress = () => ethers.utils.hexlify(ethers.utils.randomBytes(20));
function generateEthWallets(count, provider) {
    const wallets = [];
    for (let i = 0; i < count; i++) {
        let wallet = ethers.Wallet.createRandom();
        if (provider) {
            wallet = wallet.connect(provider);
        }
        wallets.push(wallet);
    }
    return wallets;
}
exports.generateEthWallets = generateEthWallets;
exports.setupTestEnv = (web3) => {
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const unlockedAccount = new ethers.Wallet("0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d", provider);
    return { provider, unlockedAccount };
};
function signMessageVRS(message, wallet) {
    const signingKey = new ethers.SigningKey(wallet.privateKey);
    const sig = signingKey.signDigest(message);
    if (typeof sig.recoveryParam === "undefined") {
        throw Error("Signature failed.");
    }
    return [sig.recoveryParam + 27, sig.r, sig.s];
}
function signMessageBytes(message, wallet) {
    const [v, r, s] = signMessageVRS(message, wallet);
    return (ethers.utils.hexlify(ethers.utils.padZeros(r, 32)).substring(2) +
        ethers.utils.hexlify(ethers.utils.padZeros(s, 32)).substring(2) +
        v.toString(16));
}
function signMessage(message, ...wallets) {
    wallets.sort((a, b) => a.address.localeCompare(b.address));
    const signatures = wallets.map(w => signMessageBytes(message, w));
    return `0x${signatures.join("")}`;
}
exports.signMessage = signMessage;
function getParamFromTxEvent(transaction, eventName, paramName, contract, contractFactory) {
    let logs = transaction.logs;
    if (eventName != null) {
        logs = logs.filter(l => l.event === eventName && l.address === contract);
    }
    chai.assert.equal(logs.length, 1, "too many logs found!");
    const param = logs[0].args[paramName];
    if (contractFactory != null) {
        return contractFactory.at(param);
    }
    else {
        return param;
    }
}
exports.getParamFromTxEvent = getParamFromTxEvent;
async function assertRejects(q, msg) {
    let res;
    let catchFlag = false;
    try {
        res = await q;
    }
    catch (e) {
        catchFlag = true;
    }
    finally {
        if (!catchFlag) {
            chai.assert.fail(res, null, msg);
        }
    }
}
exports.assertRejects = assertRejects;
exports.mineOneBlock = () => {
    const web3 = global.web3;
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            id: new Date().getTime(),
            jsonrpc: "2.0",
            method: "evm_mine",
            params: []
        }, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
};
exports.mineBlocks = async (blocks) => {
    for (let i = 0; i < blocks; i++) {
        await exports.mineOneBlock();
    }
};
//# sourceMappingURL=utils.js.map