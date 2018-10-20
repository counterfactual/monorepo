pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


contract CountingApp {

  enum ActionTypes { INCREMENT, DECREMENT}

  struct Action {
    ActionTypes actionType;
    uint256 byHowMuch;
  }

  struct AppState {
    address player1;
    address player2;
    uint256 count;
    uint256 turnNum;
  }

  function isStateTerminal(AppState state)
    public
    pure
    returns (bool)
  {
    return state.count == 2;
  }

  function getTurnTaker(AppState state)
    public
    pure
    returns (uint256)
  {
    return state.turnNum % 2;
  }

  function resolve(AppState state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Transaction)
  {
    uint256[] memory amounts = new uint256[](2);
    amounts[0] = terms.limit;
    amounts[1] = 0;

    address[] memory to = new address[](2);
    to[0] = state.player1;
    to[1] = state.player2;
    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

  function applyAction(AppState state, Action action)
    public
    pure
    returns (bytes)
  {
    if (action.actionType == ActionTypes.INCREMENT) {
      return onIncrement(state, action);
    } else if (action.actionType == ActionTypes.DECREMENT) {
      return onDecrement(state, action);
    } else {
      revert("Invalid action type");
    }
  }

  function onIncrement(AppState state, Action inc)
    public
    pure
    returns (bytes)
  {
    AppState memory ret = state;
    state.count += inc.byHowMuch;
    state.turnNum += 1;
    return abi.encode(ret);
  }

  function onDecrement(AppState state, Action dec)
    public
    pure
    returns (bytes)
  {
    AppState memory ret = state;
    state.count -= dec.byHowMuch;
    state.turnNum += 1;
    return abi.encode(ret);
  }

}
