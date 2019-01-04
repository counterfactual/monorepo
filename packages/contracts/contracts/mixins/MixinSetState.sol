pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/LibSignature.sol";
import "../libs/LibStaticCall.sol";

import "./MAppRegistryCore.sol";
import "./MAppCaller.sol";


contract MixinSetState is
  LibSignature,
  LibStateChannelApp,
  MAppRegistryCore,
  MAppCaller
{

  struct SignedStateHashUpdate {
    bytes32 stateHash;
    uint256 nonce;
    uint256 timeout;
    bytes signatures;
  }

  /// @notice Set the application state to a given value.
  /// This value must have been signed off by all parties to the channel, that is,
  /// this must be called with the correct msg.sender (the state deposit holder)
  /// or signatures must be provided.
  /// @param appIdentity an AppIdentity struct with all information encoded within
  ///        it to represent which particular app is having state submitted
  /// @param req An object containing the update to be applied to the
  ///        applications state including the signatures of the users needed
  /// @dev This function is only callable when the state channel is in an ON state.
  function setState(
    AppIdentity memory appIdentity,
    SignedStateHashUpdate memory req
  )
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appStates[identityHash];

    require(
      challenge.status == AppStatus.ON,
      "setState was called on an app that is either in DISPUTE or OFF"
    );

    if (msg.sender != appIdentity.owner) {
      require(
        correctKeysSignedTheStateUpdate(
          identityHash,
          appIdentity.signingKeys,
          req
        ),
        "Call to setState included incorrectly signed state update"
      );
    }

    require(
      req.nonce > challenge.nonce,
      "Tried to call setState with an outdated nonce version"
    );

    challenge.status = req.timeout > 0 ? AppStatus.DISPUTE : AppStatus.OFF;
    challenge.appStateHash = req.stateHash;
    challenge.nonce = req.nonce;
    challenge.finalizesAt = block.number + req.timeout;
    challenge.disputeNonce = 0;
    challenge.disputeCounter += 1;
    challenge.latestSubmitter = msg.sender;
  }

  function correctKeysSignedTheStateUpdate(
    bytes32 identityHash,
    address[] memory signingKeys,
    SignedStateHashUpdate memory req
  )
    private
    pure
    returns (bool)
  {
    bytes32 digest = computeStateHash(
      identityHash,
      req.stateHash,
      req.nonce,
      req.timeout
    );

    return verifySignatures(
      req.signatures,
      digest,
      signingKeys
    );
  }

}
