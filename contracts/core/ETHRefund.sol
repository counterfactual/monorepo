pragma solidity ^0.4.19;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";


contract ETHRefund is Counterfactual {

	struct State {
		address recipient;
		uint256 threshold;
	}

	State public _state;

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function setState(State state, uint256 nonce) public safeUpdate(nonce) {
		_state = state;
	}
}
