pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";


contract SimpleSwapSwitch {
  enum ActionType {
    SET_SWAPPED
  }

  struct Action {
    ActionType actionType;
  }

  struct AppState {
    bool swapped;
  }

  function isStateTerminal(AppState state)
    public
    pure
    returns (bool) {
    return state.swapped;
  }

  function turnTaker(AppState state)
    public
    pure
    returns (uint256)
  {
    return 0;
  }

  function applyAction(AppState state, Action action)
    public
    view
    returns (bytes)
  {
    AppState memory nextState = state;
    if (action.actionType == ActionType.SET_SWAPPED) {
      nextState.swapped = true;
    } else {
      revert("Illegal action");
    }
    return nextState;
  }
}
