pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "./BaseCFObject.sol";

contract Nonce is BaseCFObject {

    using CFLib for CFLib.ObjectStorage;

    struct State {
        uint256 nonce;
    }

    State public state;

    function Nonce(
        State _state,
        CFLib.ObjectStorage _objectStorage
    ) public {
        objectStorage.init(_objectStorage);
        state = _state;
    }

    function update(
        State s
    )
        public
        safeCommitment
    {
        require(s.nonce > state.nonce);
        state.nonce = s.nonce;
    }

}
