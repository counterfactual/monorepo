pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Transfer.sol";


contract CountingApp {

  enum ActionTypes { INCREMENT, DECREMENT}

  struct Action {
    ActionTypes actionType;
    uint256 byHowMuch;
  }

  struct State {
    address player1;
    address player2;
    uint256 count;
    uint256 turnNum;
  }

  function turn(State state)
    public
    pure
    returns (uint256)
  {
    return state.turnNum % 2;
  }

  function resolver(State state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    uint256[] memory amounts = new uint256[](2);
    amounts[0] = terms.limit;
    amounts[1] = 0;

    address[] memory to = new address[](2);
    to[0] = state.player1;
    to[1] = state.player2;

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amounts
    );
  }

  function reducer(State state, Action action)
    public
    view
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

  function onIncrement(State state, Action inc)
    public
    pure
    returns (bytes)
  {
    State memory ret = state;
    state.count += inc.byHowMuch;
    state.turnNum += 1;
    return abi.encode(ret);
  }

  function onDecrement(State state, Action dec)
    public
    pure
    returns (bytes)
  {
    State memory ret = state;
    state.count -= dec.byHowMuch;
    state.turnNum += 1;
    return abi.encode(ret);
  }

}
