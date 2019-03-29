pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";
import "../CounterfactualApp.sol";

// there is a counter; player2 can unanimously increment it


contract AppWithAction {

  struct State {
    address player1;
    address player2;
    uint256 counter;
  }

  struct Action {
    uint256 increment;
  }

  function getTurnTaker(bytes memory encodedState, address[] memory signingKeys)
    public
    pure
    returns (address)
  {
    State memory state = abi.decode(encodedState, (State));
    return state.player2;
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    State memory state = abi.decode(encodedState, (State));

    uint256[] memory amounts = new uint256[](2);

    address[] memory to = new address[](2);

    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory ret)
  {
    State memory state = abi.decode(encodedState, (State));
    Action memory action = abi.decode(encodedAction, (Action));

    state.counter += action.increment;

    return abi.encode(state);
  }
}
