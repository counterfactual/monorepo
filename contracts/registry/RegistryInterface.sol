pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";


interface RegistryInterface {

	event ContractCreated(bytes32 cfAddress, address deployedAddress);

	// FIXME: Convert to external.
	function deploy(bytes, bytes32) public returns (address);

	function deployAndCall(bytes, bytes) public returns (address);

	function resolve(bytes32) external returns (address);

}
