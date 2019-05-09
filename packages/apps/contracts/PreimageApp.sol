pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";


contract PreimageApp {

  struct AppState {
    bytes32 image;
    bool preimageRevealed;
  }

  struct Action {
    bytes preimage;
  }

  function isStateTerminal(bytes memory encodedState)
    public
    pure
    returns (bool)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return state.preimageRevealed;
  }

  function getTurnTaker(
    bytes memory /* encodedState */, address[] memory signingKeys
  )
    public
    pure
    returns (address)
  {
    return signingKeys[0];
  }

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    Action memory action = abi.decode(encodedAction, (Action));

    require(
      !state.preimageRevealed,
      "No actions possible after preimage revealed");

    AppState memory nextState = state;

    if (keccak256(action.preimage) == state.image) {
      nextState.preimageRevealed = true;
    }
    return abi.encode(nextState);
  }

  function resolve(bytes memory encodedState)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    if (state.preimageRevealed) {
      return abi.encode(1);
    } else {
      return abi.encode(0);
    }
  }
}
