pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";
import "../CounterfactualApp.sol";


contract CountingAppWithAbiDecode is CounterfactualApp {

  enum ActionTypes { INCREMENT, DECREMENT}

  struct Increment {
    uint256 byHowMuch;
    uint256 arg2;
  }

  struct Decrement {
    uint256 byHowMuch;
    uint256 arg2;
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

  function isStateTerminal(bytes memory encodedState)
    public
    pure
    returns (bool)
  {
    State memory state = abi.decode(encodedState, (State));
    return state.count == 2;
  }

  function getTurnTaker(bytes memory encodedState, address[] memory signingKeys)
    public
    pure
    returns (address)
  {
    State memory state = abi.decode(encodedState, (State));
    return signingKeys[state.turnNum % 2];
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    State memory state = abi.decode(encodedState, (State));

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

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory ret)
  {
    State memory state = abi.decode(encodedState, (State));
    Action memory action = abi.decode(encodedAction, (Action));

    if (action.actionType == ActionTypes.INCREMENT) {
      Increment memory inc = abi.decode(action.encodedActionData, (Increment));
      ret = onIncrement(state, inc);
    } else if (action.actionType == ActionTypes.DECREMENT) {
      Decrement memory dec = abi.decode(action.encodedActionData, (Decrement));
      ret = onDecrement(state, dec);
    } else {
      revert("Invalid action type");
    }
  }

  function onIncrement(State memory state, Increment memory inc)
    public
    pure
    returns (bytes memory)
  {
    State memory ret = state;
    ret.count += inc.byHowMuch;
    ret.turnNum += 1;
    return abi.encode(ret);
  }

  function onDecrement(State memory state, Decrement memory dec)
    public
    pure
    returns (bytes memory)
  {
    State memory ret = state;
    ret.count -= dec.byHowMuch;
    ret.turnNum += 1;
    return abi.encode(ret);
  }

}
