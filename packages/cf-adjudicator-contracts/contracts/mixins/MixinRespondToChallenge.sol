pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/LibAppCaller.sol";

import "./MChallengeRegistryCore.sol";


contract MixinRespondToChallenge is
  LibStateChannelApp,
  LibAppCaller,
  MChallengeRegistryCore
{

  /// @notice Respond to a challenge with a valid action
  /// @param appIdentity an AppIdentity object pointing to the app for which there is a challenge to progress
  /// @param appState The ABI encoded latest signed application state
  /// @param action The ABI encoded action the submitter wishes to take
  /// @param actionSignature A bytes string of a single signature by the address of the
  /// participant for which it is their turn to take the submitted `action`
  /// @dev This function is only callable when the application has an open challenge
  function respondToChallenge(
    AppIdentity memory appIdentity,
    bytes memory appState,
    bytes memory action,
    bytes memory actionSignature
  )
    public
  {

    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appChallenges[identityHash];

    require(
      (
        challenge.status == ChallengeStatus.FINALIZES_AFTER_DEADLINE
      ) && challenge.finalizesAt >= block.number,
      "respondToChallenge called on app not in FINALIZES_AFTER_DEADLINE state"
    );

    require(
      keccak256(appState) == challenge.appStateHash,
      "Tried to progress a challenge with non-agreed upon app"
    );

    address turnTaker = getTurnTaker(
      appIdentity.appDefinition,
      appIdentity.participants,
      appState
    );

    require(
      turnTaker == keccak256(action).recover(actionSignature),
      "Action must have been signed by correct turn taker"
    );

    // This should throw an error if reverts
    applyAction(
      appIdentity.appDefinition,
      appState,
      action
    );

    delete appChallenges[identityHash];

  }
}
