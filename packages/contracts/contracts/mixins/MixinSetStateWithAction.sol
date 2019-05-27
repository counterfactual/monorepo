pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/LibSignature.sol";
import "../libs/LibStaticCall.sol";

import "./MChallengeRegistryCore.sol";
import "./MChannelState.sol";
import "./MAppCaller.sol";


contract MixinSetStateWithAction is
  LibSignature,
  LibStateChannelApp,
  MChallengeRegistryCore,
  MChannelState,
  MAppCaller
{

  // TODO: If you make memory calldata and public external you get
  //       `UnimplementedFeatureError:` upon compilation. Wasn't this fixed?

  /// @notice Challenges the logical next turn taker of an application to progress the state
  /// @dev Note this function is only callable when the state channel is in an ON state
  function challenge(
    ChannelState memory prevChannelState,
    ChannelState memory nextChannelState,
    bytes memory signatures
  )
    public
  {
    bytes32 prevIdentityHash = keccak256(
      abi.encode(
        prevChannelState.owner,         // Unique per state channel
        prevChannelState.participants,  // Unique per app instance
        prevChannelState.appDefinition  // Unique per app definition
      )
    );

    bytes32 nextIdentityHash = keccak256(
      abi.encode(
        nextChannelState.owner,
        nextChannelState.participants,
        nextChannelState.appDefinition
      )
    );

    require(
      prevIdentityHash == nextIdentityHash,
      "Cannot challenge with non-equivalent ChannelState objects."
    );

    AppChallenge storage appChallenge = appChallenges[prevIdentityHash];

    require(
      appChallenge.status == AppStatus.ON,
      "Cannot call challenge on an existing challenge."
    );

    require(
      nextChannelState.nonce > prevChannelState.nonce,
      "Cannot challenge a ChannelState with a ChannelState having a lower nonce."
    );

    require(
      nextChannelState.turnNum > prevChannelState.turnNum,
      "Cannot challenge a ChannelState with a ChannelState having a lower turnNum."
    );

    require(
      recoverKey(
        signatures, keccak256(abi.encode(prevChannelState)), 0
      ) == getTurnTaker(prevChannelState),
      "ChannelState given to challenge on was invalid; signed by wrong turn taker."
    );

    require(
      recoverKey(
        signatures, keccak256(abi.encode(nextChannelState)), 1
      ) == getTurnTaker(nextChannelState),
      "ChannelState given as challenge was invalid; signed by wrong turn taker."
    );

    // TODO: Generalize function call
    bytes memory newState = CounterfactualApp(nextChannelState.appDefinition)
      .applyAction(
        prevChannelState.appState,
        nextChannelState.transitionData
      );

    require(
      keccak256(newState) == keccak256(nextChannelState.appState),
      "Transition to new ChannelState must follow rules of the AppDefinition."
    );

    appChallenge.finalizesAt = block.number + nextChannelState.challengeTimeout;
    appChallenge.status = AppStatus.IN_CHALLENGE;

    appChallenge.appStateHash = keccak256(newState);
    appChallenge.nonce = nextChannelState.nonce;
    appChallenge.challengeNonce = 0;
    appChallenge.challengeCounter += 1;
    appChallenge.latestSubmitter = msg.sender;
  }

}

// TODO: Double check we don't need these
//
// Not required because of identityHashCheck
// require(
//   prevChannelState.appDefinition == nextChannelState.appDefinition,
//   "Cannot challenge two ChannelState objects with different appDefinition properties."
// );
//
// Not required because of identityHashCheck
// require(
//   keccak256(prevChannelState.participants) == keccak256(nextChannelState.participants),
//   "Cannot challenge two ChannelState objects with different participants."
// );


// TODO: Figure out how to do signing states with same turnNum to do unanimous signing
//
// uint256 turnNumDelta;
//
// uint256 prevTurnNum = prevChannelState.turnNum %
//   prevChannelState.participants.length;
//
// uint256 nextTurnNum = nextChannelState.turnNum %
//   nextChannelState.participants.length;
//
// if (prevTurnNum < nextTurnNum) {
//   turnNumDelta = min(
//     prevTurnNum - nextTurnNum,
//     nextTurnNum - prevTurnNum + nextChannelState.participants.length
//   );
// } else if (nextTurnNum < prevTurnNum) {
//   turnNumDelta = min(
//     nextTurnNum - prevTurnNum,
//     prevTurnNum - nextTurnNum + nextChannelState.participants.length
//   );
// } else {
//   revert("Cannot challenge yourself (both ChannelStates have the same turnNum).");
// }
//
// require(
//   prevChannelState.signatures is of prevChannelState
//   and done by prevChannelState.participants[prevChannelState.turnNum],
//   "Needs to be signed by the right guy."
// );
//
// for (i in length of turnNumDelta) {
//   require(
//     nextChannelState.signatures is of nextChannelState
//     and done by nextChannelState.participants[i]
//     "Needs to be signed by the right guy too."
//   );
// }

// TODO: Figure out isTerminal stuff
//
// if (nextChannelState.isTerminal) {
//   require(
//     MAppCaller.isStateTerminal(appIdentity.appDefinition, newState),
//     "Attempted to claim non-terminal state was terminal in setStateWithAction"
//   );
//   challenge.finalizesAt = block.number;
//   challenge.status = AppStatus.OFF;
// } else {
//   challenge.finalizesAt = block.number + req.timeout;
//   challenge.status = AppStatus.IN_CHALLENGE;
// }
