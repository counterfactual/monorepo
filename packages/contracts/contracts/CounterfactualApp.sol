pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";


contract CounterfactualApp {

  function isStateTerminal(bytes calldata)
    external
    pure
    returns (bool)
  {
    revert("not implemented");
  }

  function getTurnTaker(bytes calldata, address[] calldata)
    external
    pure
    returns (address)
  {
    revert("not implemented");
  }

  function applyAction(bytes calldata, bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    revert("not implemented");
  }

  function resolve(bytes calldata, Transfer.Terms calldata)
    external
    pure
    returns (Transfer.Transaction memory)
  {
    revert("not implemented");
  }

}
