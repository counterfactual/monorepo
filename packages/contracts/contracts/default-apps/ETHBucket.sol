pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";
import "../CounterfactualApp.sol";


contract ETHBucket is CounterfactualApp {

  struct AppState {
    address alice;
    address bob;
    uint256 aliceBalance;
    uint256 bobBalance;
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    uint256[] memory amounts = new uint256[](2);
    amounts[0] = state.aliceBalance;
    amounts[1] = state.bobBalance;

    address[] memory to = new address[](2);
    to[0] = state.alice;
    to[1] = state.bob;
    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
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

  function applyAction(bytes memory, bytes memory)
    public
    pure
    returns (bytes memory)
  {
    revert("Not implemented");
  }

}
