pragma solidity ^0.4.19;

import './IRegistry.sol';

/// @title Counterfactual Registry - A counterfactual addressing registry
/// @author Liam Horne - <liam@counterfactual.com>
contract Registry is IRegistry {

    string public constant NAME = "Counterfactual Registry";
    string public constant VERSION = "0.0.1";

    // isDeployed allows to check if a counterfactual address has been deployed
    mapping(bytes32 => address) public isDeployed;

    function getTransactionHash(bytes code) public view returns (bytes32) {
        return keccak256(byte(0x19), this, code);
    }

    function getCounterfactualAddress(bytes code, address[] owners) public view returns (bytes32) {
        return keccak256(code, owners);
    }

    function deploySigned(
        bytes code,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
    ) public returns (address) {
        require(v.length == r.length && r.length == s.length);

        bytes32 codeHash = getTransactionHash(code);
        address[] memory owners = new address[](v.length);
        for (uint8 i = 0; i < v.length; i++) {
            owners[i] = ecrecover(codeHash, v[i], r[i], s[i]);
        }

        return deploy(code, owners);
    }

    function deployAsOwner(bytes code) public returns (address) {
        address[] memory _owners = new address[](1);
        _owners[0] = msg.sender;

        return deploy(code, _owners);
    }

    function deploy(bytes code, address[] owners) private returns (address newContract) {

        bytes32 cfAddress = getCounterfactualAddress(code, owners);

        assembly {
            newContract := create(0, add(code, 0x20), mload(code))
        }

        require(newContract != 0x0);
        require(isDeployed[cfAddress] == 0x0);

        ContractCreated(cfAddress, newContract);

        isDeployed[cfAddress] = newContract;

        return newContract;
    }

    function resolve(bytes32 cfAddress) public view returns (address) {
        return isDeployed[cfAddress];
    }

    function proxyCall(address registry, bytes32 cfAddress, bytes data) public {
        address to = Registry(registry).resolve(cfAddress);
        require(to != 0x0);

        uint256 dataSize = data.length;
        bool ret;
        assembly {
            calldatacopy(mload(0x40), 132, dataSize)
            ret := call(gas, to, 0, mload(0x40), dataSize, 0, 0)
        }
        require(ret);
        ContractUpdated(cfAddress, to);
    }

    function proxyDelegatecall(address registry, bytes32 cfAddress, bytes data) public {
        address to = Registry(registry).resolve(cfAddress);
        require(to != 0x0);

        uint256 dataSize = data.length;
        bool ret;
        assembly {
            calldatacopy(mload(0x40), 132, dataSize)
            ret := delegatecall(gas, to, mload(0x40), dataSize, 0, 0)
        }
        require(ret);
        ContractWithdrawn(cfAddress, to);
    }

}
