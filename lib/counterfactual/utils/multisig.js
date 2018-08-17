"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("@counterfactual/test-utils");
const buildArtifacts_1 = require("./buildArtifacts");
class Multisig {
    constructor(owners) {
        this.owners = owners;
        owners.sort((a, b) => a.localeCompare(b));
    }
    get address() {
        if (!this.contract) {
            throw new Error("Must deploy Multisig contract first");
        }
        return this.contract.address;
    }
    async deploy(signer) {
        this.contract = await buildArtifacts_1.MinimumViableMultisig.deploy(signer);
        await this.contract.functions.setup(this.owners);
    }
    async execDelegatecall(toContract, funcName, args, signers) {
        return this.execTransaction(toContract, funcName, args, 1, signers);
    }
    async execCall(toContract, funcName, args, signers) {
        return this.execTransaction(toContract, funcName, args, 0, signers);
    }
    async execTransaction(toContract, funcName, args, operation, wallets) {
        if (!this.contract) {
            throw new Error("Must deploy Multisig contract first");
        }
        const value = 0;
        const calldata = toContract.interface.functions[funcName].encode(args);
        const transactionHash = await this.contract.functions.getTransactionHash(toContract.address, value, calldata, operation);
        const options = operation === 1 ? test_utils_1.HIGH_GAS_LIMIT : {};
        const signatures = test_utils_1.signMessage(transactionHash, ...wallets);
        return this.contract.functions.execTransaction(toContract.address, value, calldata, operation, signatures, options);
    }
}
exports.Multisig = Multisig;
//# sourceMappingURL=multisig.js.map