pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/StaticCall.sol";

contract InheritedThing {
  enum StateFlags { IN_PROGRESS, CONCLUDED }
  function dispatch(bytes4 selector, bytes state, bytes action) {
    address(this).staticcall(abi.encodePacked(selector, state, action));
  }
}

contract ActionCountingGame is Reducer {

  enum ActionTypes { INCREMENT, DECREMENT}

  struct Action {
    ActionTypes actionType;
    bytes data;
  }

  struct Increment {
    uint256 byHowMuch;
  }

  struct Decrement {
    uint256 byHowMuch;
  }

  struct State {
    uint8 count;
    uint8 turnNum;
  }

  function turn(State state, address[] keys)
    public
    pure
    returns (address)
  {
    return keys[turnNum % 2];
  }

  function reducer(State state, Action action)
    public
    view
    returns (State)
  {
    bytes4 dispatchTo;

    if (Action.actionType == ActionTypes.INCREMENT) {
      dispatchTo = this.onIncrement.selector;
    } else if (Action.actionType == ActionTypes.DECREMENT) {
      dispatchTo = this.onDecrement.selector;
    } else {
      revert("Invalid action type");
    }

    return dispatch(dispatchTo, abi.encode(state), action.data);
  }

  function onIncrement(State state, Increment inc)
    public
    pure
    returns (State)
  {
    return State(state.count + inc.byHowMuch, state.turnNum++);
  }

  function onDecrement(State state, Decrement dec)
    public
    pure
    returns (State)
  {
    return State(state.count - dec.byHowMuch, state.turnNum++);
  }

}
