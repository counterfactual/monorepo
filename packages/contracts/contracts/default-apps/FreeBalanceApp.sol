pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";
import "../CounterfactualApp.sol";

contract FreeBalanceApp is CounterfactualApp {

  struct AppState {
    address[] peers;
    uint256[] balances;
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      state.peers,
      state.balances,
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

  function applyAction(bytes memory, bytes memory)
    public
    pure
    returns (bytes memory)
  {
    revert("Not implemented");
  }

}
