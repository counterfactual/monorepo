"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai = __importStar(require("chai"));
const ethereum_waffle_1 = require("ethereum-waffle");
const utils_1 = require("ethers/utils");
exports.expect = chai.use(ethereum_waffle_1.solidity).expect;
var AssetType;
(function (AssetType) {
    AssetType[AssetType["ETH"] = 0] = "ETH";
    AssetType[AssetType["ERC20"] = 1] = "ERC20";
    AssetType[AssetType["ANY"] = 2] = "ANY";
})(AssetType = exports.AssetType || (exports.AssetType = {}));
class App {
    constructor(owner, signingKeys, appInterfaceHash, termsHash, defaultTimeout) {
        this.owner = owner;
        this.signingKeys = signingKeys;
        this.appInterfaceHash = appInterfaceHash;
        this.termsHash = termsHash;
        this.defaultTimeout = defaultTimeout;
    }
    get id() {
        return this.hashOfEncoding();
    }
    toJson() {
        return {
            owner: this.owner,
            signingKeys: this.signingKeys,
            appInterfaceHash: this.appInterfaceHash,
            termsHash: this.termsHash,
            defaultTimeout: this.defaultTimeout
        };
    }
    hashOfEncoding() {
        return utils_1.keccak256(utils_1.defaultAbiCoder.encode([App.ABI_ENCODER_V2_ENCODING], [this.toJson()]));
    }
}
App.ABI_ENCODER_V2_ENCODING = `
    tuple(
      address owner,
      address[] signingKeys,
      bytes32 appInterfaceHash,
      bytes32 termsHash,
      uint256 defaultTimeout
    )
  `;
exports.App = App;
class AppInterface {
    constructor(addr, getTurnTaker, applyAction, resolve, isStateTerminal) {
        this.addr = addr;
        this.getTurnTaker = getTurnTaker;
        this.applyAction = applyAction;
        this.resolve = resolve;
        this.isStateTerminal = isStateTerminal;
    }
    hashOfPackedEncoding() {
        return utils_1.keccak256(utils_1.defaultAbiCoder.encode([AppInterface.ABI_ENCODER_V2_ENCODING], [
            {
                addr: this.addr,
                getTurnTaker: this.getTurnTaker,
                applyAction: this.applyAction,
                resolve: this.resolve,
                isStateTerminal: this.isStateTerminal
            }
        ]));
    }
}
AppInterface.ABI_ENCODER_V2_ENCODING = `
    tuple(
      address addr,
      bytes4 getTurnTaker,
      bytes4 applyAction,
      bytes4 resolve,
      bytes4 isStateTerminal
    )
  `;
exports.AppInterface = AppInterface;
class Terms {
    constructor(assetType, limit, token) {
        this.assetType = assetType;
        this.limit = limit;
        this.token = token;
    }
    hashOfPackedEncoding() {
        return utils_1.keccak256(utils_1.defaultAbiCoder.encode([Terms.ABI_ENCODER_V2_ENCODING], [
            {
                assetType: this.assetType,
                limit: this.limit,
                token: this.token
            }
        ]));
    }
}
Terms.ABI_ENCODER_V2_ENCODING = "tuple(uint8 assetType, uint256 limit, address token)";
exports.Terms = Terms;
exports.computeStateHash = (id, appStateHash, nonce, timeout) => utils_1.keccak256(utils_1.solidityPack(["bytes1", "bytes32", "uint256", "uint256", "bytes32"], ["0x19", id, nonce, timeout, appStateHash]));
exports.computeActionHash = (turnTaker, previousState, action, setStateNonce, disputeNonce) => utils_1.keccak256(utils_1.solidityPack(["bytes1", "address", "bytes", "bytes", "uint256", "uint256"], ["0x19", turnTaker, previousState, action, setStateNonce, disputeNonce]));
class AppInstance {
    constructor(owner, signingKeys, appInterface, terms, defaultTimeout) {
        this.owner = owner;
        this.signingKeys = signingKeys;
        this.appInterface = appInterface;
        this.terms = terms;
        this.defaultTimeout = defaultTimeout;
    }
    get id() {
        return this.hashOfEncoding();
    }
    get appIdentity() {
        return {
            owner: this.owner,
            signingKeys: this.signingKeys,
            appInterfaceHash: this.appInterface.hashOfPackedEncoding(),
            termsHash: this.terms.hashOfPackedEncoding(),
            defaultTimeout: this.defaultTimeout
        };
    }
    hashOfEncoding() {
        return utils_1.keccak256(utils_1.defaultAbiCoder.encode([
            `tuple(
            address owner,
            address[] signingKeys,
            bytes32 appInterfaceHash,
            bytes32 termsHash,
            uint256 defaultTimeout
          )`
        ], [this.appIdentity]));
    }
}
exports.AppInstance = AppInstance;
//# sourceMappingURL=index.js.map