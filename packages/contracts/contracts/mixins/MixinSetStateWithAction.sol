pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/LibSignature.sol";
import "../libs/LibStaticCall.sol";

import "./MChallengeRegistryCore.sol";
import "./MAppCaller.sol";


contract MixinSetStateWithAction is
  LibSignature,
  LibStateChannelApp,
  MChallengeRegistryCore,
  MAppCaller
{

  struct SignedAppChallengeUpdateWithAppState {
    // NOTE: We include the full bytes of the state update,
    //       not just the hash of it as in MixinSetState.
    bytes appState;
    uint256 nonce;
    uint256 timeout;
    bytes signatures;
  }

  struct SignedAction {
    bytes encodedAction;
    bytes signature;
    bool checkForTerminal;
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
      correctKeysSignedAppChallengeUpdate(identityHash, appIdentity.signingKeys, req),
      "Call to setStateWithAction included incorrectly signed state update"
    );

    require(
      challenge.status == ChallengeStatus.NO_CHALLENGE ||
      (challenge.status == ChallengeStatus.CHALLENGE_IS_OPEN && challenge.finalizesAt >= block.number),
      "setStateWithAction was called on an app that has already been finalized"
    );

    require(
      req.nonce > challenge.nonce,
      "setStateWithAction was called with outdated state"
    );

    require(
      correctKeySignedTheAction(
        appIdentity.appDefinition,
        appIdentity.signingKeys,
        challenge.challengeNonce,
        req,
        action
      ),
      "setStateWithAction called with action signed by incorrect turn taker"
    );

    bytes memory newState = MAppCaller.applyAction(
      appIdentity.appDefinition,
      req.appState,
      action.encodedAction
    );

    if (action.checkForTerminal) {
      require(
        MAppCaller.isStateTerminal(appIdentity.appDefinition, newState),
        "Attempted to claim non-terminal state was terminal in setStateWithAction"
      );
      challenge.finalizesAt = block.number;
      challenge.status = ChallengeStatus.CHALLENGE_WAS_FINALIZED;
    } else {
      challenge.finalizesAt = block.number + req.timeout;
      challenge.status = ChallengeStatus.CHALLENGE_IS_OPEN;
    }

    challenge.appStateHash = keccak256(newState);
    challenge.nonce = req.nonce;
    challenge.challengeNonce = 0;
    challenge.challengeCounter += 1;
    challenge.latestSubmitter = msg.sender;
  }

  function correctKeysSignedAppChallengeUpdate(
    bytes32 identityHash,
    address[] memory signingKeys,
    SignedAppChallengeUpdateWithAppState memory req
  )
    private
    pure
    returns (bool)
  {
    bytes32 digest = computeAppChallengeHash(
      identityHash,
      keccak256(req.appState),
      req.nonce,
      req.timeout
    );
    return verifySignatures(req.signatures, digest, signingKeys);
  }

  function correctKeySignedTheAction(
    address appDefinition,
    address[] memory signingKeys,
    uint256 challengeNonce,
    SignedAppChallengeUpdateWithAppState memory req,
    SignedAction memory action
  )
    private
    pure
    returns (bool)
  {
    address turnTaker = MAppCaller.getTurnTaker(
      appDefinition,
      signingKeys,
      req.appState
    );

    address signer = recoverKey(
      action.signature,
      computeActionHash(
        turnTaker,
        keccak256(req.appState),
        action.encodedAction,
        req.nonce,
        challengeNonce
      ),
      0
    );

    return turnTaker == signer;
  }

}
