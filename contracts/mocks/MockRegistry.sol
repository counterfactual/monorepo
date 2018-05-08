pragma solidity ^0.4.19;

import "../../contracts/interfaces/IRegistry.sol";


contract MockRegistry is IRegistry {

	mapping(bytes32 => address) lookup;
	mapping(address => bytes32) reverseLookup;

	function () external payable {}

	function setLookup(bytes32 cfAddr, address addr) public {
		lookup[cfAddr] = addr;
		reverseLookup[addr] = cfAddr;
	}

	function resolve(bytes32 cfAddr) external view returns (address) {
		return lookup[cfAddr];
	}

	function reverseResolve(address addr) external view returns (bytes32) {
		return reverseLookup[addr];
	}

	function proxyCall(address registry, bytes32 cfAddr, bytes data) external {
		address to = MockRegistry(registry).resolve(cfAddr);
		require(to != 0x0);

		uint256 dataSize = data.length;
		bool ret;
		assembly {
			calldatacopy(mload(0x40), 132, dataSize)
			ret := call(gas, to, 0, mload(0x40), dataSize, 0, 0)
		}
		require(ret);
	}

	event ContractCreated(bytes32 cfAddress, address deployedAddress);
	event ContractUpdated(bytes32 cfAddress, address deployedAddress);
	event ContractWithdrawn(bytes32 cfAddress, address deployedAddress);
	function deploySigned(bytes, uint8[], bytes32[], bytes32[]) external returns (address) {}
	function deployAsOwner(bytes) external returns (address) {}
	function proxyDelegatecall(address, bytes32, bytes) external {}
}
