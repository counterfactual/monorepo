pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/Transfer.sol";
import "@counterfactual/contracts/contracts/CounterfactualApp.sol";


/// @title High Roller App
/// @notice This contract allows the playing of a dice rolling game.
///         Two players take turns rolling two dice each.
///         The winner is the player whose sum of dice outcomes is highest.
/// @dev This contract is an example of a dApp built to run on
///      the CounterFactual framework
contract HighRollerApp is CounterfactualApp {

  enum ActionType {
    START_GAME,
    COMMIT_TO_HASH,
    COMMIT_TO_NUM,
    REVEAL
  }

  enum Stage {
    PRE_GAME,
    COMMITTING_HASH,
    COMMITTING_NUM,
    REVEALING,
    DONE
  }

  enum Player {
    FIRST,
    SECOND
  }

  struct AppState {
    address[2] playerAddrs;
    Stage stage;
    bytes32 salt;
    bytes32 commitHash;
    uint256 playerFirstNumber;
    uint256 playerSecondNumber;
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

    return state.stage == Stage.COMMITTING_NUM ?
      signingKeys[uint8(Player.SECOND)] :
      signingKeys[uint8(Player.FIRST)];
  }

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    Action memory action = abi.decode(encodedAction, (Action));

    AppState memory nextState = state;

    if (action.actionType == ActionType.START_GAME) {
      require(
        state.stage == Stage.PRE_GAME,
        "Cannot apply START_GAME on PRE_GAME"
      );
      nextState.stage = Stage.COMMITTING_HASH;
    } else if (action.actionType == ActionType.COMMIT_TO_HASH) {
      require(
        state.stage == Stage.COMMITTING_HASH,
        "Cannot apply COMMIT_TO_HASH on COMMITTING_HASH"
      );
      nextState.stage = Stage.COMMITTING_NUM;

      nextState.commitHash = action.actionHash;
    } else if (action.actionType == ActionType.COMMIT_TO_NUM) {
      require(
        state.stage == Stage.COMMITTING_NUM,
        "Cannot apply COMMIT_TO_NUM on COMMITTING_NUM"
      );
      nextState.stage = Stage.REVEALING;

      nextState.playerSecondNumber = action.number;
    } else if (action.actionType == ActionType.REVEAL) {
      require(
        state.stage == Stage.REVEALING,
        "Cannot apply REVEAL on REVEALING"
      );
      nextState.stage = Stage.DONE;

      nextState.playerFirstNumber = action.number;
      nextState.salt = action.actionHash;
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

    uint256[] memory amounts = new uint256[](2);
    address[] memory to = new address[](2);
    to[0] = state.playerAddrs[0];
    to[1] = state.playerAddrs[1];
    bytes32 expectedCommitHash = keccak256(
      abi.encodePacked(state.salt, state.playerFirstNumber)
    );
    if (expectedCommitHash == state.commitHash) {
      amounts = getWinningAmounts(
        state.playerFirstNumber, state.playerSecondNumber, terms.limit
      );
    } else {
      amounts[0] = 0;
      amounts[1] = terms.limit;
    }

    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

  function getWinningAmounts(uint256 num1, uint256 num2, uint256 termsLimit)
    public
    pure
    returns (uint256[] memory)
  {
    uint256[] memory amounts = new uint256[](2);
    bytes32 randomSalt = calculateRandomSalt(num1, num2);
    (uint8 playerFirstTotal, uint8 playerSecondTotal) = highRoller(randomSalt);
    if (playerFirstTotal > playerSecondTotal) {
      amounts[0] = termsLimit;
      amounts[1] = 0;
    } else if (playerFirstTotal < playerSecondTotal) {
      amounts[0] = 0;
      amounts[1] = termsLimit;
    } else {
      amounts[0] = termsLimit / 2;
      amounts[1] = termsLimit / 2;
    }
    return amounts;
  }

  function highRoller(bytes32 randomness)
    public
    pure
    returns(uint8 playerFirstTotal, uint8 playerSecondTotal)
  {
    (bytes8 hash1, bytes8 hash2,
    bytes8 hash3, bytes8 hash4) = cutBytes32(randomness);
    playerFirstTotal = bytes8toDiceRoll(hash1) + bytes8toDiceRoll(hash2);
    playerSecondTotal = bytes8toDiceRoll(hash3) + bytes8toDiceRoll(hash4);
  }

  function calculateRandomSalt(uint256 num1, uint256 num2)
    public
    pure
    returns (bytes32)
  {
    require(
      num1 != 0 && num2 != 0,
      "Numbers passed in cannot equal 0"
      );
    return keccak256(abi.encodePacked(num1 * num2));
  }

  /// @notice Splits a bytes32 into 4 bytes8 by cutting every 8 bytes
  /// @param h The bytes32 to be split
  /// @dev Takes advantage of implicitly recognizing the length of each bytes8
  ///      variable when being read by `mload`. We point to the start of each
  ///      string (e.g., 0x08, 0x10) by incrementing by 8 bytes each time.
  function cutBytes32(bytes32 h)
    public
    pure
    returns (bytes8 q1, bytes8 q2, bytes8 q3, bytes8 q4)
  {
    assembly {
      let ptr := mload(0x40)
      mstore(add(ptr, 0x00), h)
      q1 := mload(add(ptr, 0x00))
      q2 := mload(add(ptr, 0x08))
      q3 := mload(add(ptr, 0x10))
      q4 := mload(add(ptr, 0x18))
    }
  }

  /// @notice Converts a bytes8 into a uint64 between 1-6
  /// @param q The bytes8 to convert
  /// @dev Splits this by using modulo 6 to get the uint
  function bytes8toDiceRoll(bytes8 q)
    public
    pure
    returns (uint8)
  {
    return uint8(uint64(q) % 6);
  }
}
