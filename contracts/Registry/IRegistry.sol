pragma solidity ^0.4.19;

interface IRegistry {

    event ContractCreated(bytes32 cfAddress, address deployedAddress);

    event ContractUpdated(bytes32 cfAddress, address deployedAddress);
    
    event ContractWithdrawn(bytes32 cfAddress, address deployedAddress);

    function getTransactionHash(bytes) public view returns (bytes32);

    function getCounterfactualAddress(bytes, address[]) public view returns (bytes32);

    function deploySigned(bytes, uint8[], bytes32[], bytes32[]) public returns (address);

    function deployAsOwner(bytes) public returns (address);

    function resolve(bytes32) public view returns (address);

    function proxyCall(address, bytes32, bytes) public;

    function proxyDelegatecall(address, bytes32, bytes) public;

}
