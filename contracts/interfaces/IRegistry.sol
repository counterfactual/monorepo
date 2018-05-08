pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

interface IRegistry {

	event ContractCreated(bytes32 cfAddress, address deployedAddress);

	event ContractUpdated(bytes32 cfAddress, address deployedAddress);
	
	event ContractWithdrawn(bytes32 cfAddress, address deployedAddress);

	function deploySigned(bytes, uint8[], bytes32[], bytes32[]) external returns (address);

	function deployAsOwner(bytes) external returns (address);

	function resolve(bytes32) external view returns (address);

	function reverseResolve(address) external view returns (bytes32);

	function proxyCall(address, bytes32, bytes) external;

	function proxyDelegatecall(address, bytes32, bytes) external;

}
