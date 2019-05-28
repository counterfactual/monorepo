pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../interfaces/Interpreter.sol";
import "../interfaces/TwoPartyOutcome.sol";

// there is a counter; player2 can unanimously increment it


contract AppWithAction is CounterfactualApp {

  struct State {
    address player1;
    address player2;
    uint256 counter;
  }

  struct Action {
    uint256 increment;
  }

  function getTurnTaker(
    bytes calldata encodedState, address[] calldata /* signingKeys */
  )
    external
    pure
    returns (address)
  {
    State memory state = abi.decode(encodedState, (State));
    return state.player2;
  }

  function computeOutcome(bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(TwoPartyOutcome.Outcome.SEND_TO_ADDR_ONE);
  }

  function applyAction(
    bytes calldata encodedState,
    bytes calldata encodedAction
  )
    external
    pure
    returns (bytes memory ret)
  {
    State memory state = abi.decode(encodedState, (State));
    Action memory action = abi.decode(encodedAction, (Action));

    state.counter += action.increment;

    return abi.encode(state);
  }

  function isStateTerminal(bytes calldata)
    external
    pure
    returns (bool)
  {
    return false;
  }

  function outcomeType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.OutcomeType.TWO_PARTY_OUTCOME);
  }
}
