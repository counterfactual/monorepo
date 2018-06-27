pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "./RegistryInterface.sol";


contract Registry is RegistryInterface {

	mapping(bytes32 => address) public isDeployed;

	function resolve(bytes32 cfAddress) external returns (address) {
		return isDeployed[cfAddress];
	}

	function getCounterfactualAddress(
		bytes code,
		bytes32 salt
	)
		public
		pure
		returns (bytes32)
	{
		return keccak256(abi.encodePacked(byte(0x19), code, salt));
	}

	function deploy(
		bytes code,
		bytes32 salt
	)
		public
		returns (address)
	{
		address newContract;
		bytes32 cfAddress = getCounterfactualAddress(code, salt);

		assembly {
			newContract := create(0, add(code, 0x20), mload(code))
		}

		require(newContract != 0x0);
		require(isDeployed[cfAddress] == 0x0);

		isDeployed[cfAddress] = newContract;

		emit ContractCreated(cfAddress, newContract);

		return newContract;
	}

	function deployAndCall(
		bytes code,
		bytes data
	)
		public
		returns (address)
	{
		address newContract = deploy(code, keccak256(data));

		if (data.length > 0) {
			assembly {
				if eq(call(gas, newContract, 0, add(data, 0x20), mload(data), 0, 0), 0) { revert(0, 0) }
			}
		}

		return newContract;
	}

}
