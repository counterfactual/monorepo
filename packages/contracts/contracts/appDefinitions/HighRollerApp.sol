pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


/*
  This contract is for a dice rolling game.
  Two players roll two dice each.
  The winner is the player whose sum of dice outcomes is highest.
*/
contract HighRollerApp {

  enum ActionType {
    COMMIT_TO_HASH,
    COMMIT_TO_NUM
  }

  enum Stage {
    COMMITTING_HASH, 
    COMMITTING_NUM, 
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
    uint256 commitNum;
    uint256 hashNum;
  }

  struct Action {
    ActionType actionType;
    uint256 number;
    bytes32 actionHash;
  }

  function isStateTerminal(AppState state)
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
    return state.stage == Stage.COMMITTING_NUM ? Player.SECOND : Player.FIRST;
    }

  function applyAction(AppState state, Action action)
    public
    pure
    returns (bytes)
  {
    AppState memory nextState = state;
    if (action.actionType == ActionType.COMMIT_TO_HASH) {
      require(state.stage == Stage.COMMITTING_HASH, "Cannot apply COMMIT_TO_HASH on COMMITTING_HASH");
      nextState.stage = Stage.COMMITTING_NUM;

      nextState.commitHash = action.actionHash;
    } else if (action.actionType == ActionType.COMMIT_TO_NUM) {
      require(state.stage == Stage.COMMITTING_NUM, "Cannot apply COMMITTING_NUM on COMMITTING_NUM");
      nextState.stage = Stage.DONE;

      nextState.commitNum = action.number;
    } else {
      revert("Invalid action type");
    }
    return abi.encode(nextState);
  }

  function resolve(AppState state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Transaction)
  {
    bytes32 salt = state.salt;
    uint256 playerFirstNumber = state.hashNum;
    uint256 playerSecondNumber = state.commitNum;

    uint256[] memory amounts = new uint256[](2);
    address[] memory to = new address[](2);
    to[0] = state.playerAddrs[0];
    to[1] = state.playerAddrs[1];
    bytes32 expectedCommitHash = keccak256(abi.encodePacked(salt, playerFirstNumber));
    if (expectedCommitHash == state.commitHash) {
      amounts = getWinningAmounts(playerFirstNumber, playerSecondNumber, terms.limit);
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
    returns (uint256[])
  {
    uint256[] memory amounts = new uint256[](2);
    bytes32 finalHash = calculateFinalHash(num1, num2);
    (bytes8 hash1, bytes8 hash2, bytes8 hash3, bytes8 hash4) = cutBytes32(finalHash);
    uint256 total1 = bytes8toDiceRoll(hash1) + bytes8toDiceRoll(hash2);
    uint256 total2 = bytes8toDiceRoll(hash3) + bytes8toDiceRoll(hash4);
    if (total1 > total2) {
      amounts[0] = termsLimit;
      amounts[1] = 0;
    } else if (total1 < total2) {
      amounts[0] = 0;
      amounts[1] = termsLimit;
    } else {
      amounts[0] = termsLimit / 2;
      amounts[1] = termsLimit / 2;
    }
    return amounts;
  }
  
  function calculateFinalHash(uint256 num1, uint256 num2) 
    public
    pure
    returns (bytes32)
  {
    uint256 mult = num1 * num2;
    return keccak256(abi.encodePacked(mult));
  }

  /// @notice Splits a bytes32 into 4 bytes8 by cutting every 8 bytes
  /// @param h The bytes32 to be split
  /// @dev Takes advantage of implicitly recognizing the length of each bytes8
  ///            variable when being read by `mload`. We point to the start of each
  ///            string (e.g., 0x08, 0x10) by incrementing by 8 bytes each time.
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
  /// @dev Splits this by using modulas 6 to get the uint
  function bytes8toDiceRoll(bytes8 q)
    public
    pure
    returns (uint)
  {
    return uint64(q) % 6;
  }
}
