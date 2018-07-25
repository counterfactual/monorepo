pragma solidity ^0.4.24;

import "../../cf-core/contracts/lib/Transfer.sol";


// No support for enums in libraries or calls to libraries using ABI encoded structs
contract GuessNumber {

  enum ActionTypes {
    SET_MAX,
    CHOOSE_NUMBER,
    GUESS_NUMBER,
    REVEAL_NUMBER
  }

  enum StateNumber {
    SETTING_MAX, CHOOSING, GUESSING, REVEALING, DONE
  }

  struct State {
    StateNumber stateNum;
    address choosingPlayer;
    address guessingPlayer;
    uint256 maximum;
    uint256 guessedNumber;
    bytes32 numberHash;
    address winner;
  }

  struct Action {
    ActionTypes actionType;
    uint256 number;
    bytes32 hash;
  }

  function isFinalState(State state)
    public
    pure
    returns (bool)
  {
    return state.winner != address(0);
  }

  function turn(State state)
    public
    pure
    returns (uint256)
  {
    if (state.stateNum == StateNumber.GUESSING) {
      return state.guessingPlayer;
    }
    return state.choosingPlayer;
  }

  function reducer(State state, Action action, address turnTaker)
  public
  view
  returns (bytes)
  {
    State memory nextState = state;
    if (action.actionType == ActionTypes.SET_MAX) {
      require(state.stateNum == StateNumber.SETTING_MAX);
      nextState.stateNum = StateNumber.CHOOSING;

      nextState.maximum = action.number;
    }
    else if (action.actionType == ActionTypes.CHOOSE_NUMBER) {
      require(state.stateNum == StateNumber.CHOOSING);
      nextState.stateNum = StateNumber.GUESSING;

      nextState.numberHash = action.hash;
    }
    else if (action.actionType == ActionTypes.GUESS_NUMBER) {
      require(state.stateNum == StateNumber.GUESSING);
      nextState.stateNum = StateNumber.REVEALING;

      require(action.number < state.maximum);
      nextState.guessedNumber = action.number;
    }
    else if (action.actionType == ActionTypes.REVEAL_NUMBER) {
      require(state.stateNum == StateNumber.REVEALING);
      nextState.stateNum = StateNumber.DONE;

      bytes32 salt = action.hash;
      uint256 chosenNumber = action.number;
      if (keccak256(salt, chosenNumber) == state.numberHash &&
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

  function resolver(State state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = terms.limit;

    address[] memory to = new address[](1);
    to[0] = state.winner;

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amounts
    );
  }
}
