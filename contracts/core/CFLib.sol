pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "../interfaces/IRegistry.sol";

library CFLib {

	struct CFAddress {
		address registry;
		bytes32 addr;
	}

	function lookup(CFAddress memory self) public returns (address) {
		bool isNotCounterfactual =  self.registry == 0x0;

		if (isNotCounterfactual) {
			return address(self.addr >> 96);
		}

	    return IRegistry(self.registry).resolve(self.addr);
	}
}
