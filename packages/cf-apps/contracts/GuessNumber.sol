pragma solidity ^0.4.24;

import "../../cf-core/contracts/lib/Transfer.sol";


// Enums in libraries or calls to libraries using ABI encoded structs are broken in Solidity
// Therefore, we are forced to use contracts
contract GuessNumber {

  enum ActionType {
    SET_MAX,
    CHOOSE_NUMBER,
    GUESS_NUMBER,
    REVEAL_NUMBER
  }

  enum Stage {
    SETTING_MAX, CHOOSING, GUESSING, REVEALING, DONE
  }

  struct AppState {
    Stage stage;
    uint256 choosingPlayer;
    uint256 guessingPlayer;
    address[2] players;
    uint256 maximum;
    uint256 guessedNumber;
    bytes32 commitHash;
    address winner;
  }

  struct Action {
    ActionType actionType;
    uint256 number;
    bytes32 hash;
  }

  function isFinalState(AppState state)
    public
    pure
    returns (bool)
  {
    return state.stage == Stage.DONE;
  }

  function getTurnTaker(AppState state)
    public
    pure
    returns (uint256)
  {
    if (state.stage == Stage.GUESSING) {
      return state.guessingPlayer;
    }
    return state.choosingPlayer;
  }

  function reducer(AppState state, Action action)
    public
    view
    returns (bytes)
  {
    AppState memory nextState = state;
    if (action.actionType == ActionType.SET_MAX) {
      require(state.stage == Stage.SETTING_MAX);
      nextState.stage = Stage.CHOOSING;

      nextState.maximum = action.number;
    }
    else if (action.actionType == ActionType.CHOOSE_NUMBER) {
      require(state.stage == Stage.CHOOSING);
      nextState.stage = Stage.GUESSING;

      nextState.commitHash = action.hash;
    }
    else if (action.actionType == ActionType.GUESS_NUMBER) {
      require(state.stage == Stage.GUESSING);
      nextState.stage = Stage.REVEALING;

      require(action.number < state.maximum);
      nextState.guessedNumber = action.number;
    }
    else if (action.actionType == ActionType.REVEAL_NUMBER) {
      require(state.stage == Stage.REVEALING);
      nextState.stage = Stage.DONE;

      bytes32 salt = action.hash;
      uint256 chosenNumber = action.number;
      if (keccak256(salt, chosenNumber) == state.commitHash &&
        state.guessedNumber != chosenNumber &&
        chosenNumber < state.maximum) {
        nextState.winner = state.choosingPlayer;
      }
      else {
        nextState.winner = state.guessingPlayer;
      }
    }
    else {
      revert("Invalid action type");
    }
    return abi.encode(nextState);
  }

  function resolver(AppState state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = terms.limit;

    address[] memory to = new address[](1);
    if (state.stage == Stage.DONE) {
      to[0] = state.winner;
    }
    else {
      // The player who is not the turn taker
      to[0] = state.players[1 - getTurnTaker(state)];
    }

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amounts
    );
  }
}
