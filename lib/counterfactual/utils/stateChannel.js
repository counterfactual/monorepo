"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers = require("ethers");
const utils_1 = require("../../test-utils/src/utils");
const artifacts = require("./buildArtifacts");
const structEncoding_1 = require("./structEncoding");
const { keccak256 } = ethers.utils;
var AssetType;
(function (AssetType) {
    AssetType[AssetType["ETH"] = 0] = "ETH";
    AssetType[AssetType["ERC20"] = 1] = "ERC20";
})(AssetType = exports.AssetType || (exports.AssetType = {}));
function appFromContract(contract) {
    return {
        addr: contract.address,
        applyAction: contract.interface.functions.applyAction.sighash,
        resolve: contract.interface.functions.resolve.sighash,
        getTurnTaker: contract.interface.functions.getTurnTaker.sighash,
        isStateTerminal: contract.interface.functions.isStateTerminal.sighash
    };
}
class StateChannel {
    constructor(signerAddrs, multisig, appContract, appStateEncoding, terms, defaultTimeout = 10) {
        this.signerAddrs = signerAddrs;
        this.multisig = multisig;
        this.appStateEncoding = appStateEncoding;
        this.terms = terms;
        this.defaultTimeout = defaultTimeout;
        this.appStateNonce = 0;
        if (this.terms.token === undefined) {
            this.terms.token = utils_1.ZERO_ADDRESS;
        }
        this.app = appFromContract(appContract);
    }
    async deploy(sender, registry) {
        const appHash = keccak256(structEncoding_1.encodeStruct(exports.appEncoding, this.app));
        const termsHash = keccak256(structEncoding_1.encodeStruct(exports.termsEncoding, this.terms));
        this.contract = await artifacts.StateChannel.deployViaRegistry(sender, registry, [
            this.multisig.address,
            this.signerAddrs,
            appHash,
            termsHash,
            this.defaultTimeout
        ]);
    }
    async setState(appState, signers, timeout = 0, appStateNonce = this.appStateNonce + 1) {
        if (!this.contract) {
            throw new Error("Not deployed");
        }
        const appStateHash = keccak256(structEncoding_1.encodeStruct(this.appStateEncoding, appState));
        const stateHash = computeStateHash(this.signerAddrs, appStateHash, appStateNonce, timeout);
        const signatures = utils_1.signMessage(stateHash, ...signers);
        await this.contract.functions.setState(appStateHash, appStateNonce, timeout, signatures);
        this.appStateNonce = appStateNonce;
    }
    async setResolution(appState) {
        if (!this.contract) {
            throw new Error("Not deployed");
        }
        await this.contract.functions.setResolution(this.app, structEncoding_1.encodeStruct(this.appStateEncoding, appState), structEncoding_1.encodeStruct(exports.termsEncoding, this.terms));
    }
}
exports.StateChannel = StateChannel;
function computeStateHash(signingKeys, appStateHash, appStateNonce, timeout) {
    return ethers.utils.solidityKeccak256(["bytes1", "address[]", "uint256", "uint256", "bytes32"], ["0x19", signingKeys, appStateNonce, timeout, appStateHash]);
}
exports.computeStateHash = computeStateHash;
function computeActionHash(turnTaker, prevStateHash, action, appStateNonce, disputeNonce) {
    return ethers.utils.solidityKeccak256(["bytes1", "address", "bytes32", "bytes", "uint256", "uint256"], ["0x19", turnTaker, prevStateHash, action, appStateNonce, disputeNonce]);
}
exports.computeActionHash = computeActionHash;
function computeNonceRegistryKey(multisigAddress, nonceSalt) {
    return ethers.utils.solidityKeccak256(["address", "bytes32"], [multisigAddress, nonceSalt]);
}
exports.computeNonceRegistryKey = computeNonceRegistryKey;
exports.termsEncoding = structEncoding_1.abiEncodingForStruct(`
  uint8 assetType;
  uint256 limit;
  address token;
`);
exports.appEncoding = structEncoding_1.abiEncodingForStruct(`
  address addr;
  bytes4 applyAction;
  bytes4 resolve;
  bytes4 getTurnTaker;
  bytes4 isStateTerminal;
`);
//# sourceMappingURL=stateChannel.js.map