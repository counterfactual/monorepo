pragma solidity 0.5.3;
pragma experimental "ABIEncoderV2";

import "../libs/LibSignature.sol";
import "../libs/LibStateChannelApp.sol";
import "../libs/LibStaticCall.sol";

import "./MAppRegistryCore.sol";
import "./MAppCaller.sol";


contract MixinProgressChallenge is
  LibSignature,
  LibStateChannelApp,
  MAppRegistryCore,
  MAppCaller
{

  /// @notice Respond to a dispute with a valid action
  /// @param appIdentity TBD
  /// @param appState The ABI encoded latest signed application state
  /// @param action The ABI encoded action the submitter wishes to take
  /// @param actionSignature A bytes string of a single signature by the address of the
  /// signing key for which it is their turn to take the submitted `action`
  /// @param claimFinal If set, the caller claims that the action progresses the state
  /// to a terminal / finalized state
  /// @dev This function is only callable when the state channel is in a DISPUTE state
  function progressDispute(
    AppIdentity memory appIdentity,
    bytes memory appState,
    bytes memory action,
    bytes memory actionSignature,
    bool claimFinal
  )
    public
  {

    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appStates[identityHash];

    require(
      challenge.status == AppStatus.DISPUTE && challenge.finalizesAt >= block.number,
      "cancelChallenge called on app not in DISPUTE state"
    );

    require(
      keccak256(appState) == challenge.appStateHash,
      "Invalid state submitted"
    );

    require(
      keccak256(abi.encode(appState)) == challenge.appStateHash,
      "Tried to resolve dispute with non-agreed upon app"
    );

    address turnTaker = getTurnTaker(
      appIdentity.appDefinitionAddress,
      appIdentity.signingKeys,
      appState
    );

    require(
      turnTaker == LibSignature.recoverKey(actionSignature, keccak256(action), 0),
      "Action must have been signed by correct turn taker"
    );

    // bytes memory newAppState = executeAppApplyAction(app, appState, action);

    // state.appStateHash = keccak256(newAppState);
    // state.disputeNonce += 1;
    // state.latestSubmitter = msg.sender;

    // if (claimFinal) {
    //   require(
    //     isAppStateTerminal(app, newAppState),
    //     "Attempted to claimFinal on a non-terminal state"
    //   );
    //   state.finalizesAt = block.number;
    //   state.status = Status.OFF;

    //   emit DisputeFinalized(msg.sender, newAppState);
    // } else {
    //   state.status = Status.DISPUTE;
    //   state.finalizesAt = block.number + defaultTimeout;

    //   emit DisputeProgressed(
    //     msg.sender,
    //     appState,
    //     action,
    //     newAppState,
    //     state.disputeNonce,
    //     block.number + defaultTimeout
    //   );
    // }
  }

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

    AppChallenge storage challenge = appStates[identityHash];

    require(
      challenge.status == AppStatus.DISPUTE && challenge.finalizesAt >= block.number,
      "cancelChallenge called on app not in DISPUTE state"
    );

    bytes32 stateHash = computeStateHash(
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
