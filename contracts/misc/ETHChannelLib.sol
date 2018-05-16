pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";


library ETHChannelLib {
	struct Balance {
		address receiver;
		uint256 amount;
	}
}
