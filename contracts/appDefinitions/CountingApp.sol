pragma solidity 0.4.24;
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

  function resolve(AppState state, Transfer.TransactionLimit terms)
    public
    pure
    returns (Transfer.Transaction)
  {
    // todo(ldct): wait what
    return Transfer.make1PTransaction(
      terms,
      state.player1,
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
