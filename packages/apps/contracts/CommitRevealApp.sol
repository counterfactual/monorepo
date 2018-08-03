pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";


// Enums in libraries or calls to libraries using ABI encoded structs are broken in Solidity
// Therefore, we are forced to use contracts
contract CommitRevealApp {

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
    bytes32 hash;
  }

  function isStateFinal(AppState state)
    public
    pure
    returns (bool)
  {
    return state.stage == Stage.DONE;
  }

  function getTurnTaker(AppState state)
    public
    pure
    returns (Player)
  {
    if (state.stage == Stage.GUESSING) {
      return Player.GUESSING;
    }
    return Player.CHOOSING;
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
      if (
        keccak256(abi.encodePacked(salt, chosenNumber)) == state.commitHash &&
        state.guessedNumber != chosenNumber &&
        chosenNumber < state.maximum) {
        nextState.winner = Player.CHOOSING;
      }
      else {
        nextState.winner = Player.GUESSING;
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
    uint256 player;
    if (state.stage == Stage.DONE) {
      player = uint256(state.winner);
    }
    else {
      // The player who is not the turn taker
      player = 1 - uint256(getTurnTaker(state));
    }
    to[0] = state.playerAddrs[player];

    bytes memory data;

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }
}
