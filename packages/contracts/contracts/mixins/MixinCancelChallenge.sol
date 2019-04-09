pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/LibSignature.sol";
import "../libs/LibStateChannelApp.sol";
import "../libs/LibStaticCall.sol";

import "./MAppRegistryCore.sol";


contract MixinCancelChallenge is
  LibSignature,
  LibStateChannelApp,
  MAppRegistryCore
{

  /// @notice Unanimously agree to cancel a dispute
  /// @param appIdentity an AppIdentity object pointing to the app being cancelled
  /// @param signatures Signatures by all signing keys of the currently latest disputed
  /// state; an indication of agreement of this state and valid to cancel a dispute
  /// @dev Note this function is only callable when the state channel is in a DISPUTE state
  function cancelChallenge(
    AppIdentity memory appIdentity,
    bytes memory signatures
  )
    // TODO: Uncomment when ABIEncoderV2 supports `external`
    //       ref: https://github.com/ethereum/solidity/issues/3199
    // external
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appChallenges[identityHash];

    require(
      challenge.status == AppStatus.DISPUTE && challenge.finalizesAt >= block.number,
      "cancelChallenge called on app not in DISPUTE state"
    );

    bytes32 stateHash = computeAppChallengeHash(
      identityHash,
      challenge.appStateHash,
      challenge.nonce,
      appIdentity.defaultTimeout
    );

    if (msg.sender != appIdentity.owner) {
      require(
        verifySignatures(signatures, stateHash, appIdentity.signingKeys),
        "Invalid signatures"
      );
    }

    challenge.disputeNonce = 0;
    challenge.finalizesAt = 0;
    challenge.status = AppStatus.ON;
    challenge.latestSubmitter = msg.sender;
  }
}
