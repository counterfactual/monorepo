pragma solidity 0.5.7;
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
  /// @param appIdentity an AppIdentity object pointing to the app for which there is a challenge to progress
  /// @param appState The ABI encoded latest signed application state
  /// @param action The ABI encoded action the submitter wishes to take
  /// @param actionSignature A bytes string of a single signature by the address of the
  /// signing key for which it is their turn to take the submitted `action`
  /// @param claimFinal If set, the caller claims that the action progresses the state
  /// to a terminal / finalized state
  /// @dev This function is only callable when the state channel is in a DISPUTE state
  function progressChallenge(
    AppIdentity memory appIdentity,
    bytes memory appState,
    bytes memory action,
    bytes memory actionSignature,
    bool claimFinal
  )
    public
  {

    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage challenge = appChallenges[identityHash];

    require(
      challenge.status == AppStatus.DISPUTE && challenge.finalizesAt >= block.number,
      "cancelChallenge called on app not in DISPUTE state"
    );

    require(
      keccak256(appState) == challenge.appStateHash,
      "Invalid state submitted"
    );

    require(
      keccak256(appState) == challenge.appStateHash,
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

    bytes memory newAppState = applyAction(
      appIdentity.appDefinitionAddress,
      appState,
      action
    );

    challenge.appStateHash = keccak256(newAppState);
    challenge.disputeNonce += 1;
    challenge.latestSubmitter = msg.sender;

    if (claimFinal) {
      require(
        isStateTerminal(appIdentity.appDefinitionAddress, newAppState),
        "Attempted to claimFinal on a non-terminal state"
      );
      challenge.finalizesAt = block.number;
      challenge.status = AppStatus.OFF;
    } else {
      challenge.status = AppStatus.DISPUTE;
      challenge.finalizesAt = block.number + appIdentity.defaultTimeout;
    }

  }
}
