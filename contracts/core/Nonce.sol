pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "../common/Counterfactual.sol";


contract Nonce is Counterfactual {  

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function setState(uint256 nonce) public safeUpdate(nonce) {}

}
