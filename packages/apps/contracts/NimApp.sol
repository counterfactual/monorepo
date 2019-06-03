pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
// solium-disable-next-line
import "@counterfactual/contracts/contracts/interfaces/TwoPartyFixedOutcome.sol";


/*
Normal-form Nim
https://en.wikipedia.org/wiki/Nim
*/
contract NimApp is CounterfactualApp {

  struct Action {
    uint256 pileIdx;
    uint256 takeAmnt;
  }

  struct AppState {
    uint256 turnNum;
    uint256[3] pileHeights;
  }

  function isStateTerminal(bytes calldata encodedState)
    external
    pure
    returns (bool)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return isWin(state);
  }

  function getTurnTaker(
    bytes calldata encodedState, address[] calldata signingKeys
  )
    external
    pure
    returns (address)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return signingKeys[state.turnNum % 2];
  }

  function applyAction(
    bytes calldata encodedState, bytes calldata encodedAction
  )
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    Action memory action = abi.decode(encodedAction, (Action));

    require(action.pileIdx < 3, "pileIdx must be 0, 1 or 2");
    require(
      state.pileHeights[action.pileIdx] >= action.takeAmnt, "invalid pileIdx"
    );

    AppState memory ret = state;

    ret.pileHeights[action.pileIdx] -= action.takeAmnt;
    ret.turnNum += 1;

    return abi.encode(ret);
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    // TODO: Reverts should not happen, it should return an outcome where
    //       the person whose took the most recent turn gets all funds.
    require(
      isWin(state),
      "Given state to computeOutcome was not in a winning position"
    );

    if (state.turnNum % 2 == 0) {
      return abi.encode(TwoPartyFixedOutcome.Outcome.SEND_TO_ADDR_ONE);
    } else {
      return abi.encode(TwoPartyFixedOutcome.Outcome.SEND_TO_ADDR_TWO);
    }
  }

  function isWin(AppState memory state)
    internal
    pure
    returns (bool)
  {
    return (
      (state.pileHeights[0] == 0) && (state.pileHeights[1] == 0) && (state.pileHeights[2] == 0)
    );
  }


}
