pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";

import "./MChallengeRegistryCore.sol";


contract MixinSetState is
  LibStateChannelApp,
  MChallengeRegistryCore
{

  struct SignedAppChallengeUpdate {
    bytes32 appStateHash;
    uint256 versionNumber;
    uint256 timeout;
    bytes[] signatures;
  }

  /// @notice Set the instance state/AppChallenge to a given value.
  /// This value must have been signed off by all parties to the channel, that is,
  /// this must be called with the correct msg.sender (the state deposit holder)
  /// or signatures must be provided.
  /// @param appIdentity an AppIdentity struct with all information encoded within
  ///        it to represent which particular app is having state submitted
  /// @param req An object containing the update to be applied to the
  ///        applications state including the signatures of the users needed
  /// @dev This function is only callable when the state channel is not in challenge
  function setState(
    AppIdentity memory appIdentity,
    SignedAppChallengeUpdate memory req
  )
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appChallenges[identityHash];

    require(
      challenge.status == ChallengeStatus.NO_CHALLENGE ||
      (
        challenge.status == ChallengeStatus.FINALIZES_AFTER_DEADLINE &&
        challenge.finalizesAt >= block.number
      ),
      "setState was called on an app that has already been finalized"
    );

    require(
      correctKeysSignedAppChallengeUpdate(
        identityHash,
        appIdentity.participants,
        req
      ),
      "Call to setState included incorrectly signed state update"
    );

    require(
      req.versionNumber > challenge.versionNumber,
      "Tried to call setState with an outdated versionNumber version"
    );

    uint248 finalizesAt = uint248(block.number + req.timeout);
    require(finalizesAt >= req.timeout, "uint248 addition overflow");

    challenge.status = req.timeout > 0 ?
      ChallengeStatus.FINALIZES_AFTER_DEADLINE :
      ChallengeStatus.EXPLICITLY_FINALIZED;

    challenge.appStateHash = req.appStateHash;
    challenge.versionNumber = uint128(req.versionNumber);
    challenge.finalizesAt = finalizesAt;
    challenge.challengeCounter += 1;
    challenge.latestSubmitter = msg.sender;
  }

  function correctKeysSignedAppChallengeUpdate(
    bytes32 identityHash,
    address[] memory participants,
    SignedAppChallengeUpdate memory req
  )
    private
    pure
    returns (bool)
  {
    bytes32 digest = computeAppChallengeHash(
      identityHash,
      req.appStateHash,
      req.versionNumber,
      req.timeout
    );

    return verifySignatures(
      req.signatures,
      digest,
      participants
    );
  }

}
