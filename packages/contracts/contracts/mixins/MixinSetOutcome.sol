pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";

import "./MChallengeRegistryCore.sol";
import "./MAppCaller.sol";


contract MixinSetOutcome is
  LibStateChannelApp,
  MChallengeRegistryCore,
  MAppCaller
{

  /// @notice Fetch and store the outcome of a state channel application
  /// @param appIdentity An AppIdentity pointing to the app having the outcome set
  /// @param finalState The ABI encoded version of the finalized application state
  /// @dev Note this function is only callable when the application has been finalized
  function setOutcome(
    AppIdentity memory appIdentity,
    bytes memory finalState
  )
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage app = appChallenges[identityHash];

    require(
      app.status == ChallengeStatus.CHALLENGE_WAS_FINALIZED ||
      (app.status == ChallengeStatus.CHALLENGE_IS_OPEN && block.number > app.finalizesAt),
      "setOutcome can only be called after a challenge has been finalized"
    );

    require(
      keccak256(finalState) == app.appStateHash,
      "setOutcome called with incorrect witness data of finalState"
    );

    appOutcomes[identityHash] = MAppCaller.computeOutcome(
      appIdentity.appDefinition,
      finalState
    );
  }

}
