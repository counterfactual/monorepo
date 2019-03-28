pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";
import "../CounterfactualApp.sol";


/// @title ResolveToPay5WeiApp
/// @notice This contract is a test fixture meant to emulate an AppInstance
/// contract. An AppInstance has a resolve() function that returns a
/// `Transfer.Transaction` object when the channel is closed.
contract ResolveToPay5WeiApp is CounterfactualApp {

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 5 wei;

    address[] memory to = new address[](1);
    to[0] = address(0);

    bytes[] memory data;

    return Transfer.Transaction(
      0,
      address(0),
      to,
      amounts,
      data
    );
  }

  function isStateTerminal(bytes memory)
    public
    pure
    returns (bool)
  {
    revert("Not implemented");
  }

  function getTurnTaker(bytes memory, address[] memory)
    public
    pure
    returns (address)
  {
    revert("Not implemented");
  }

  function applyAction(bytes memory encodedState, bytes memory)
    public
    pure
    returns (bytes memory)
  {
    return encodedState;
  }
}
