pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/LibSignature.sol";
import "../libs/LibStaticCall.sol";

import "./MAppRegistryCore.sol";
import "./MAppCaller.sol";


contract MixinVirtualAppSetState is
  LibSignature,
  LibStateChannelApp,
  MAppRegistryCore,
  MAppCaller
{

  /// signatures[0], instead of signing a message that authorizes
  /// a state update with a given stateHash, signs a message that authorizes all
  /// updates with nonce < nonceExpiry
  struct VirtualAppSignedAppChallengeUpdate {
    bytes32 appStateHash;
    uint256 nonce;
    uint256 timeout;
    bytes signatures;
    uint256 nonceExpiry;
  }

  function virtualAppSetState(
    AppIdentity memory appIdentity,
    VirtualAppSignedAppChallengeUpdate memory req
  )
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appChallenges[identityHash];

    require(
      challenge.status == AppStatus.ON,
      "setState was called on a virtual app that is either in DISPUTE or OFF"
    );

    require(
      correctKeysSignedAppChallengeUpdate(
        identityHash,
        appIdentity.signingKeys,
        req
      ),
      "Call to setState included incorrectly signed state update"
    );

    require(
      req.nonce > challenge.nonce,
      "Tried to call setState with an outdated nonce version"
    );

    require(
      req.nonce < req.nonceExpiry,
      "Tried to call setState with nonce greater than intemediary nonce expiry");

    challenge.status = req.timeout > 0 ? AppStatus.DISPUTE : AppStatus.OFF;
    challenge.appStateHash = req.appStateHash;
    challenge.nonce = req.nonce;
    challenge.finalizesAt = block.number + req.timeout;
    challenge.disputeNonce = 0;
    challenge.disputeCounter += 1;
    challenge.latestSubmitter = msg.sender;
  }

  function correctKeysSignedAppChallengeUpdate(
    bytes32 identityHash,
    address[] memory signingKeys,
    VirtualAppSignedAppChallengeUpdate memory req
  )
    private
    pure
    returns (bool)
  {
    bytes32 digest1 = computeAppChallengeHash(
      identityHash,
      req.appStateHash,
      req.nonce,
      req.timeout
    );

    bytes32 digest2 = keccak256(
      abi.encodePacked(
        byte(0x19),
        identityHash,
        req.nonceExpiry,
        req.timeout,
        byte(0x01)
      )
    );

    require(
      signingKeys[0] == recoverKey(req.signatures, digest2, 0), "Invalid signature"
    );

    address lastSigner = address(0);
    for (uint256 i = 1; i < signingKeys.length; i++) {
      require(
        signingKeys[i] == recoverKey(req.signatures, digest1, i), "Invalid signature"
      );

      require(signingKeys[i] > lastSigner, "Signers not in ascending order");

      lastSigner = signingKeys[i];
    }
    return true;
  }

}
