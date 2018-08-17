"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("@counterfactual/test-utils");
const ethers = require("ethers");
const { solidityKeccak256 } = ethers.utils;
class Contract extends ethers.Contract {
}
exports.Contract = Contract;
class AbstractContract {
    constructor(abi, binary) {
        this.abi = abi;
        this.binary = binary;
    }
    static loadBuildArtifact(artifactName, links) {
        const truffleContract = artifacts.require(artifactName);
        return AbstractContract.fromBuildArtifact(truffleContract, links);
    }
    static fromBuildArtifact(buildArtifact, links) {
        let { bytecode } = buildArtifact;
        if (links) {
            for (const name of Object.keys(links)) {
                const library = links[name];
                if (!library.deployedAddress) {
                    throw new Error("Library must have a deployed address");
                }
                const regex = new RegExp(`__${name}_+`, "g");
                const addressHex = library.deployedAddress.replace("0x", "");
                bytecode = bytecode.replace(regex, addressHex);
            }
        }
        const abstractContract = new AbstractContract(buildArtifact.abi, bytecode);
        const networkNames = Object.keys(buildArtifact.networks);
        if (networkNames.length !== 0) {
            const networkName = networkNames.sort()[0];
            abstractContract.deployedAddress =
                buildArtifact.networks[networkName].address;
        }
        return abstractContract;
    }
    getDeployed(signer) {
        if (!this.deployedAddress) {
            throw new Error("Must have a deployed address");
        }
        return new Contract(this.deployedAddress, this.abi, signer);
    }
    async deploy(signer, args) {
        return new Contract("", this.abi, signer).deploy(this.binary, ...(args || []));
    }
    async connect(signer, address) {
        return new Contract(address, this.abi, signer);
    }
    async deployViaRegistry(signer, registry, args, salt) {
        if (salt === undefined) {
            salt = solidityKeccak256(["uint256"], [Math.round(Math.random() * 4294967296)]);
        }
        const initcode = new ethers.Interface(this.abi).deployFunction.encode(this.binary, args || []);
        await registry.functions.deploy(initcode, salt, test_utils_1.HIGH_GAS_LIMIT);
        const cfAddress = solidityKeccak256(["bytes1", "bytes", "uint256"], ["0x19", initcode, salt]);
        const address = await registry.functions.resolver(cfAddress);
        const contract = new Contract(address, this.abi, signer);
        contract.cfAddress = cfAddress;
        contract.salt = salt;
        contract.registry = registry;
        return contract;
    }
}
exports.AbstractContract = AbstractContract;
//# sourceMappingURL=contract.js.map