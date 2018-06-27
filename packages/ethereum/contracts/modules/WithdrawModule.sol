pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";
import "../transfer/AssetLib.sol";


contract WithdrawModule {

	using RegistryAddressLib for RegistryAddressLib.CFAddress;
	using AssetLib for AssetLib.ETHTransfer;

	struct State {
		address recipient;
		address depositAddress;
		uint256 threshold;
	}

	function interpret(State state)
		view
		public
		returns (bytes)
	{
		AssetLib.ETHTransfer[] memory ret = new AssetLib.ETHTransfer[](1);
		ret[0].to = RegistryAddressLib.CFAddress(address(0x0), bytes20(state.recipient));
		ret[0].amount = state.depositAddress.balance - state.threshold;
		return abi.encode(ret);
	}

}
