pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";
import "../CounterfactualApp.sol";


contract ETHBalanceRefundApp {

  struct AppState {
    address recipient;
    address multisig;
    uint256 threshold;
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    view
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    uint256[] memory amounts = new uint256[](1);
    amounts[0] = address(state.multisig).balance - state.threshold;

    address[] memory to = new address[](1);
    to[0] = state.recipient;

    bytes[] memory data;

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
