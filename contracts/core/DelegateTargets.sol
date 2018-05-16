pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "../misc/ETHChannelLib.sol";
import "../interfaces/IRegistry.sol";


contract DelegateTargets {

	using ETHChannelLib for ETHChannelLib.Balance;

	function resolveETH(ETHChannelLib.Balance[] balances) public {
		for (uint256 i = 0; i < balances.length; i++) {
			balances[i].receiver.transfer(balances[i].amount);
		}
	}

}