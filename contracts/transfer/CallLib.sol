pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";


contract CallLib {

	using RegistryAddressLib for RegistryAddressLib.CFAddress;

	struct Function {
		RegistryAddressLib.CFAddress dest;
		bytes4 selector;
	}

	function isEqual(
		Function memory func,
		bytes memory parameters,
		bytes memory expected
	)
		public
		returns (bool)
	{
		return keccak256(apply(func, parameters)) == keccak256(expected);
	}

	function apply(
		Function memory self,
		bytes data
	)
		public
		returns (bytes)
	{
		require(self.dest.lookup().call(self.selector, data));
		return returnedDataDecoded();
	}

	function compose(
		Function[] calls,
		bytes memory base
	)
		public
		returns (bytes)
	{
		if (calls.length > 0) {
			bytes memory ret = apply(calls[0], base);
			for (uint256 i = 1; i < calls.length; i++) {
				ret = apply(calls[i], ret);
			}
			return ret;
		} else {
			return base;
		}
	}

	function returnedDataDecoded() internal pure returns (bytes ret) {
		assembly {
			let size := returndatasize
			switch size
			case 0 {}
			default {
				ret := mload(0x40)
				mstore(0x40, add(ret, add(size, 0x20)))
				returndatacopy(ret, 0x20, sub(size, 0x20))
			}
		}
		return ret;
	}

}
