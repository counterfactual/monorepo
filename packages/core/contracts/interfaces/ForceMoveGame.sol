pragma solidity ^0.4.24;

interface ForceMoveGame {
  function validTransition(bytes s1, bytes s2) external pure returns (bool);
}
