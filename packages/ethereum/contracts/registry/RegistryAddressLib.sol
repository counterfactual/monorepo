pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "./RegistryInterface.sol";


library RegistryAddressLib {

	struct CFAddress {
		address registry;
		bytes32 addr;
	}

	function lookup(CFAddress memory self) public view returns (address) {
		bool isNotCounterfactual = self.registry == 0x0;

		if (isNotCounterfactual) {
			return address(self.addr >> 96);
		}

		return RegistryInterface(self.registry).resolve(self.addr);
	}

}
