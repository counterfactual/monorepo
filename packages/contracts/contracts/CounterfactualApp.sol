pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";


contract CounterfactualApp {

  function isStateTerminal(bytes memory)
    public
    pure
    returns (bool);

  function getTurnTaker(bytes memory, address[] memory)
    public
    pure
    returns (address);

  function applyAction(bytes memory, bytes memory)
    public
    pure
    returns (bytes memory);

  function resolve(bytes memory, Transfer.Terms memory)
    public
    pure
    returns (Transfer.Transaction memory);

}
