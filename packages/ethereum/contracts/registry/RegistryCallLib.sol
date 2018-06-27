pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "./RegistryInterface.sol";


contract RegistryCallLib {

	function proxyCall(
		address registry,
		bytes32 cfAddress,
		bytes data
	)
		external
	{
		address to = RegistryInterface(registry).resolve(cfAddress);
		require(to != 0x0);
		require(to.call(data));
	}

}
