pragma solidity ^0.4.19;

pragma experimental "ABIEncoderV2";

import "../core/CFAddressLib.sol";


contract CFLibTester {

	using CFAddressLib for CFAddressLib.CFAddress;

	CFAddressLib.CFAddress _addr;

	constructor(CFAddressLib.CFAddress addr) public {
		_addr = addr;
	}

	function lookup() public view returns (address) {
		return _addr.lookup();
	}
}
