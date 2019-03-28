pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/Transfer.sol";
import "@counterfactual/contracts/contracts/CounterfactualApp.sol";


contract CommitRevealApp is CounterfactualApp {

  enum ActionType {
    SET_MAX,
    CHOOSE_NUMBER,
    GUESS_NUMBER,
    REVEAL_NUMBER
  }

  enum Stage {
    SETTING_MAX, CHOOSING, GUESSING, REVEALING, DONE
  }

  enum Player {
    CHOOSING,
    GUESSING
  }

  struct AppState {
    address[2] playerAddrs;
    Stage stage;
    uint256 maximum;
    uint256 guessedNumber;
    bytes32 commitHash;
    Player winner;
  }

  struct Action {
    ActionType actionType;
    uint256 number;
    bytes32 actionHash;
  }

  function isStateTerminal(bytes memory encodedState)
    public
    pure
    returns (bool)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return state.stage == Stage.DONE;
  }

  function getTurnTaker(bytes memory encodedState, address[] memory signingKeys)
    public
    pure
    returns (address)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    if (state.stage == Stage.GUESSING) {
      return signingKeys[uint8(Player.GUESSING)];
    }

    return signingKeys[uint8(Player.CHOOSING)];
  }

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    Action memory action = abi.decode(encodedAction, (Action));

    AppState memory nextState = state;
    if (action.actionType == ActionType.SET_MAX) {
      require(state.stage == Stage.SETTING_MAX, "Cannot apply SET_MAX on SETTING_MAX");
      nextState.stage = Stage.CHOOSING;

      nextState.maximum = action.number;
    } else if (action.actionType == ActionType.CHOOSE_NUMBER) {
      require(state.stage == Stage.CHOOSING, "Cannot apply CHOOSE_NUMBER on CHOOSING");
      nextState.stage = Stage.GUESSING;

      nextState.commitHash = action.actionHash;
    } else if (action.actionType == ActionType.GUESS_NUMBER) {
      require(state.stage == Stage.GUESSING, "Cannot apply GUESS_NUMBER on GUESSING");
      nextState.stage = Stage.REVEALING;

      require(action.number < state.maximum, "Action number was >= state.maximum");
      nextState.guessedNumber = action.number;
    } else if (action.actionType == ActionType.REVEAL_NUMBER) {
      require(state.stage == Stage.REVEALING, "Cannot apply REVEAL_NUMBER on REVEALING");
      nextState.stage = Stage.DONE;

      bytes32 salt = action.actionHash;
      uint256 chosenNumber = action.number;
      if (keccak256(abi.encodePacked(salt, chosenNumber)) == state.commitHash && state.guessedNumber != chosenNumber && chosenNumber < state.maximum) {
        nextState.winner = Player.CHOOSING;
      } else {
        nextState.winner = Player.GUESSING;
      }
    } else {
      revert("Invalid action type");
    }
    return abi.encode(nextState);
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    uint256[] memory amounts = new uint256[](1);
    amounts[0] = terms.limit;

    address[] memory to = new address[](1);
    uint256 player;
    if (state.stage == Stage.DONE) {
      player = uint256(state.winner);
    } else {
      // The player who is not the turn taker
      player = 1 - uint256(
        state.stage == Stage.GUESSING ? Player.GUESSING : Player.CHOOSING
      );
    }
    to[0] = state.playerAddrs[player];

    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }
}
