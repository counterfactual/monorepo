pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../libs/LibSignature.sol";
import "../libs/LibStateChannelApp.sol";
import "../libs/LibStaticCall.sol";

import "./MChallengeRegistryCore.sol";


contract MixinCancelChallenge is
  LibSignature,
  LibStateChannelApp,
  MChallengeRegistryCore
{

  /// @notice Unanimously agree to cancel a challenge
  /// @param appIdentity an AppIdentity object pointing to the app being cancelled
  /// @param signatures Signatures by all signing keys of the currently latest challenged
  /// state; an indication of agreement of this state and valid to cancel a challenge
  /// @dev Note this function is only callable when the state channel is in a IN_CHALLENGE state
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
      challenge.status == AppStatus.IN_CHALLENGE && challenge.finalizesAt >= block.number,
      "cancelChallenge called on app not in IN_CHALLENGE state"
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

    challenge.challengeNonce = 0;
    challenge.finalizesAt = 0;
    challenge.status = AppStatus.ON;
    challenge.latestSubmitter = msg.sender;
  }
}
