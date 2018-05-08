pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

contract SimpleGame {

    enum StateType {
        START,
        END
    }

    struct State {
        StateType stateType;
        uint256 nonce;
    }

    function validTransition(
        State oldState,
        State newState
    )
        public
        pure
        returns (bool)
    {
        require(oldState.nonce <= newState.nonce);
        return true;
    }

    function isFinal(State state) public pure returns (bool) {
        require(state.stateType == StateType.END);
        require(state.nonce == 1337);
        return true;
    }

}