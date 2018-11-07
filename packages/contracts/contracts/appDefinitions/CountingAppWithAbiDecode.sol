pragma solidity ^0.4.25;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";
import "./StateChannelApp.sol";

contract CountingAppWithAbiDecode is StateChannelApp {

  enum ActionTypes { INCREMENT, DECREMENT}

  struct Increment {
    uint256 byHowMuch;
  }

  struct Decrement {
    uint256 byHowMuch;
  }

  struct Action {
    ActionTypes actionType;
    bytes encodedActionData;
  }

  struct State {
    address player1;
    address player2;
    uint256 count;
    uint256 turnNum;
  }

  function isStateTerminal(bytes encodedState)
    public
    pure
    returns (bool)
  {
    State memory state = abi.decode(encodedState, State);
    return state.count == 2;
  }

  function getTurnTaker(bytes encodedState, address[] signingKeys)
    public
    pure
    returns (address)
  {
    State memory state = abi.decode(encodedState, State);
    return signingKeys[state.turnNum % 2];
  }

  function resolve(bytes encodedState, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Transaction)
  {
    State memory state = abi.decode(encodedState, State);

    uint256[] memory amounts = new uint256[](2);
    amounts[0] = (state.turnNum % 2 == 0) ? terms.limit : 0;
    amounts[1] = terms.limit - amounts[0];

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

  function applyAction(bytes encodedState, bytes encodedAction)
    public
    pure
    returns (bytes ret)
  {
    State memory state = abi.decode(encodedState, State);
    Action memory action = abi.decode(encodedAction, Action);

    if (action.actionType == ActionTypes.INCREMENT) {
      ret = onIncrement(
        state,
        abi.decode(action.encodedActionData, action)
      );
    } else if (action.actionType == ActionTypes.DECREMENT) {
      ret = onDecrement(
        state,
        abi.decode(action.encodedActionData, action)
      );
    } else {
      revert("Invalid action type");
    }
  }

  function onIncrement(State state, Increment inc)
    public
    pure
    returns (Increment)
  {
    State memory ret = state;
    state.count += inc.byHowMuch;
    state.turnNum += 1;
    return ret;
  }

  function onDecrement(State state, Decrement dec)
    public
    pure
    returns (Decrement)
  {
    State memory ret = state;
    state.count -= dec.byHowMuch;
    state.turnNum += 1;
    return ret;
  }

}
