pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "../core/CFLib.sol";

contract CFLibTester {

	using CFLib for CFLib.CFAddress;

	CFLib.CFAddress _addr;

	constructor(CFLib.CFAddress addr) public {
		_addr = addr;
	}

	function lookup() public constant returns (address) {
		return _addr.lookup();
	}
}
