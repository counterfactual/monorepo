pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/LibAppCaller.sol";

import "./MChallengeRegistryCore.sol";


contract MixinSetStateWithAction is
  LibStateChannelApp,
  LibAppCaller,
  MChallengeRegistryCore
{

  struct SignedAppChallengeUpdateWithAppState {
    // NOTE: We include the full bytes of the state update,
    //       not just the hash of it as in MixinSetState.
    bytes appState;
    uint256 versionNumber;
    uint256 timeout;
    bytes[] signatures;
  }

  struct SignedAction {
    bytes encodedAction;
    bytes signature;
  }

  /// @notice Create a challenge regarding the latest signed state and immediately after,
  /// performs a unilateral action to update it.
  /// @param appIdentity An AppIdentity pointing to the app having its challenge progressed
  /// @param req A struct with the signed state update in it
  /// @param action A struct with the signed action being taken
  /// @dev Note this function is only callable when the state channel is not in challenge
  function setStateWithAction(
    AppIdentity memory appIdentity,
    SignedAppChallengeUpdateWithAppState memory req,
    SignedAction memory action
  )
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appChallenges[identityHash];

    require(
      correctKeysSignedAppChallengeUpdate(identityHash, appIdentity.participants, req),
      "Call to setStateWithAction included incorrectly signed state update"
    );

    require(
      challenge.status == ChallengeStatus.NO_CHALLENGE ||
      (challenge.status == ChallengeStatus.FINALIZES_AFTER_DEADLINE && challenge.finalizesAt >= block.number),
      "setStateWithAction was called on an app that has already been finalized"
    );

    require(
      req.versionNumber > challenge.versionNumber,
      "setStateWithAction was called with outdated state"
    );

    require(
      correctKeySignedTheAction(
        appIdentity.appDefinition,
        appIdentity.participants,
        req,
        action
      ),
      "setStateWithAction called with action signed by incorrect turn taker"
    );

    bytes memory newState = LibAppCaller.applyAction(
      appIdentity.appDefinition,
      req.appState,
      action.encodedAction
    );


    uint248 finalizesAt = uint248(block.number + req.timeout);
    require(finalizesAt >= req.timeout, "uint248 addition overflow");

    challenge.finalizesAt = finalizesAt;
    challenge.status = ChallengeStatus.FINALIZES_AFTER_DEADLINE;
    challenge.appStateHash = keccak256(newState);
    challenge.versionNumber = uint128(req.versionNumber);
    challenge.challengeCounter += 1;
    challenge.latestSubmitter = msg.sender;
  }

  function correctKeysSignedAppChallengeUpdate(
    bytes32 identityHash,
    address[] memory participants,
    SignedAppChallengeUpdateWithAppState memory req
  )
    private
    pure
    returns (bool)
  {
    bytes32 digest = computeAppChallengeHash(
      identityHash,
      keccak256(req.appState),
      req.versionNumber,
      req.timeout
    );
    return verifySignatures(req.signatures, digest, participants);
  }

  function correctKeySignedTheAction(
    address appDefinition,
    address[] memory participants,
    SignedAppChallengeUpdateWithAppState memory req,
    SignedAction memory action
  )
    private
    pure
    returns (bool)
  {
    address turnTaker = LibAppCaller.getTurnTaker(
      appDefinition,
      participants,
      req.appState
    );

    address signer = computeActionHash(
      turnTaker,
      keccak256(req.appState),
      action.encodedAction,
      req.versionNumber
    ).recover(action.signature);

    return turnTaker == signer;
  }

}
