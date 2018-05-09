pragma solidity ^0.4.19;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";


contract ETHRefund is Counterfactual {

	struct State {
		address recipient;
		uint256 threshold;
	}

	State public state;

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function setState(State _state, uint256 nonce) public safeUpdate(nonce) {
		state = _state;
	}

}
