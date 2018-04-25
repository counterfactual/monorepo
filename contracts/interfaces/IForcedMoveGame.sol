pragma solidity ^0.4.22;

pragma experimental ABIEncoderV2;

interface IForcedMoveGame {
    function validTransition(bytes oldState, bytes newState) public pure returns (bool);
    function resolve(bytes) public pure returns (uint256);
    function isFinal(bytes) public pure returns (bool);
}