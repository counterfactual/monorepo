pragma solidity 0.5.12;
pragma experimental "ABIEncoderV2";


contract CounterfactualApp {

  function isStateTerminal(bytes memory)
    public
    pure
    returns (bool)
  {
    revert("The isStateTerminal method has no implementation for this App");
  }

  function getTurnTaker(bytes memory, address[] memory)
    public
    pure
    returns (address)
  {
    revert("The getTurnTaker method has no implementation for this App");
  }

  function applyAction(bytes memory, bytes memory)
    public
    pure
    returns (bytes memory)
  {
    revert("The applyAction method has no implementation for this App");
  }

  function computeOutcome(bytes memory)
    public
    pure
    returns (bytes memory)
  {
    revert("The computeOutcome method has no implementation for this App");
  }

}
