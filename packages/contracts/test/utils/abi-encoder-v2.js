"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("ethers/utils");
function abiEncodingForStruct(structDefinition) {
    const definitions = [];
    const lines = structDefinition.split(";");
    for (const line of lines) {
        const definition = line.trim();
        if (definition.length === 0) {
            continue;
        }
        const parts = definition.split(" ");
        if (parts.length !== 2) {
            throw new Error(`Invalid struct field. Expected '[type] [name]', got '${definition}'`);
        }
        definitions.push(definition);
    }
    return `tuple(${definitions.join(", ")})`;
}
exports.abiEncodingForStruct = abiEncodingForStruct;
function encodeStruct(encoding, struct) {
    return utils_1.defaultAbiCoder.encode([encoding], [struct]);
}
exports.encodeStruct = encodeStruct;
//# sourceMappingURL=abi-encoder-v2.js.map