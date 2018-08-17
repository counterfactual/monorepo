"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contract_1 = require("./contract");
exports.ConditionalTransfer = contract_1.AbstractContract.loadBuildArtifact("ConditionalTransfer");
exports.NonceRegistry = contract_1.AbstractContract.loadBuildArtifact("NonceRegistry");
exports.Registry = contract_1.AbstractContract.loadBuildArtifact("Registry");
exports.StaticCall = contract_1.AbstractContract.loadBuildArtifact("StaticCall");
exports.Signatures = contract_1.AbstractContract.loadBuildArtifact("Signatures");
exports.Transfer = contract_1.AbstractContract.loadBuildArtifact("Transfer");
exports.StateChannel = contract_1.AbstractContract.loadBuildArtifact("StateChannel", {
    StaticCall: exports.StaticCall,
    Signatures: exports.Signatures,
    Transfer: exports.Transfer
});
exports.MinimumViableMultisig = contract_1.AbstractContract.loadBuildArtifact("MinimumViableMultisig", {
    Signatures: exports.Signatures
});
exports.default = {
    ConditionalTransfer: exports.ConditionalTransfer,
    NonceRegistry: exports.NonceRegistry,
    Registry: exports.Registry,
    StaticCall: exports.StaticCall,
    MinimumViableMultisig: exports.MinimumViableMultisig,
    Signatures: exports.Signatures,
    Transfer: exports.Transfer,
    StateChannel: exports.StateChannel
};
//# sourceMappingURL=buildArtifacts.js.map