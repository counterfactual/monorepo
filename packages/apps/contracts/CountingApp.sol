pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/Transfer.sol";
import "@counterfactual/contracts/contracts/CounterfactualApp.sol";


contract CountingApp is CounterfactualApp {

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

  function isStateTerminal(bytes memory encodedState)
    public
    pure
    returns (bool)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return state.count == 2;
  }

  function getTurnTaker(bytes memory encodedState, address[] memory signingKeys)
    public
    pure
    returns (address)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return signingKeys[state.turnNum % 2];
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

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

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    Action memory action = abi.decode(encodedAction, (Action));

    if (action.actionType == ActionTypes.INCREMENT) {
      return onIncrement(state, action);
    } else if (action.actionType == ActionTypes.DECREMENT) {
      return onDecrement(state, action);
    } else {
      revert("Invalid action type");
    }
  }

  function onIncrement(AppState memory state, Action memory inc)
    public
    pure
    returns (bytes memory)
  {
    AppState memory ret = state;
    state.count += inc.byHowMuch;
    state.turnNum += 1;
    return abi.encode(ret);
  }

  function onDecrement(AppState memory state, Action memory dec)
    public
    pure
    returns (bytes memory)
  {
    AppState memory ret = state;
    state.count -= dec.byHowMuch;
    state.turnNum += 1;
    return abi.encode(ret);
  }

}
