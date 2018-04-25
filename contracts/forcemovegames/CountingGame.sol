pragma solidity ^0.4.22;

pragma experimental ABIEncoderV2;

// https://github.com/ethereum/solidity/issues/3199
// import "./IForcedMoveGame.sol";
// is IForcedMoveGame

contract CountingGame {

    enum StateType { Start, Final }

    struct State {
        StateType stateType;
        uint256 count;
    }

    function validTransition(State s1, State s2) public pure returns (bool) {
        if (s1.stateType == StateType.Start) {
            require(s2.count == s1.count + 1);

            return true;
        }
        revert();
    }

    function isFinal(State s) public pure returns (bool) {
        return s.stateType == StateType.Final;
    }

    function resolve(State s) public pure returns (uint256) {
        return s.count;
    }

}