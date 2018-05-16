pragma solidity 0.4.23;

pragma experimental "ABIEncoderV2";

import "./DelegateTargets.sol";
import "./CFAddressLib.sol";


contract Conditional {

	using CFAddressLib for CFAddressLib.CFAddress;

	struct Call {
		CFAddressLib.CFAddress dest;
		bytes4 selector;
	}

	function execute(
		Call call,
		bytes data
	)
		public
		view
		returns (bytes) 
	{
		require(call.dest.lookup().call(call.selector, data));
		return returnedDataDecoded();
	}

	function executeMany(Call[] calls)
		view
		public
		returns (bool) 
	{
		bytes memory ret = execute(calls[0], "");
		for (uint256 i = 1; i < calls.length; i++) {
			ret = execute(calls[i], ret);
		}
		return true;
	}

	function executeManyThenDelegate(
		Call[] calls,
		address delegate,
		bytes4 delegateSelector
	)
		public returns(bytes)
	{
		bytes memory ret = execute(calls[0], "");
		for (uint256 i = 1; i < calls.length; i++) {
			ret = execute(calls[i], ret);
		}
		require(delegate.delegatecall(delegateSelector, ret));
	}

	function returnedDataDecoded() internal pure returns (bytes ret) {
		assembly {
			let size := returndatasize
			switch size
			case 0 {}
			default {
				ret := mload(0x40) // free mem ptr get
				mstore(0x40, add(ret, add(size, 0x20))) // free mem ptr set
				returndatacopy(ret, 0x20, sub(size, 0x20)) // copy return data
			}
		}
		return ret;
	}

}
