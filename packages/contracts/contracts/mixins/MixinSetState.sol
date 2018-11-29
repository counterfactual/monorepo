pragma solidity 0.4.25;
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
  /// this must be called with the correct msg.sender or signatures must be provided.
  // TODO:
  /// @dev This function is only callable when the state channel is in an ON state.
  function setState(
    AppIdentity appIdentity,
    SignedStateHashUpdate req
  )
    public
  {
    bytes32 _id = computeAppIdentityHash(appIdentity);

    AppChallenge storage challenge = appStates[_id];

    require(
      challenge.status == AppStatus.ON,
      "setState was called on an app that is either in DISPUTE or OFF"
    );

    if (msg.sender != appIdentity.owner) {
      require(
        correctKeysSignedTheStateUpdate(
          _id,
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
    bytes32 _id,
    address[] signingKeys,
    SignedStateHashUpdate req
  )
    private
    pure
    returns (bool)
  {
    bytes32 digest = computeStateHash(
      _id,
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
