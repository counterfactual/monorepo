pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";


contract CounterfactualApp {

  function isStateTerminal(bytes calldata)
    external
    pure
    returns (bool);

  function getTurnTaker(bytes calldata, address[] calldata)
    external
    pure
    returns (address);

  function applyAction(bytes calldata, bytes calldata)
    external
    pure
    returns (bytes memory);

  function resolve(bytes calldata, Transfer.Terms calldata)
    external
    pure
    returns (Transfer.Transaction memory);

}
