pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";

import "./MAppRegistryCore.sol";
import "./MAppCaller.sol";


contract MixinSetResolution is
  LibStateChannelApp,
  MAppRegistryCore,
  MAppCaller
{

  /// @notice Fetch and store the resolution of a state channel application
  /// @param appIdentity An AppIdentity pointing to the app having the resolution set
  /// @param finalState The ABI encoded version of the finalized application state
  /// @dev Note this function is only callable when the state channel is in an OFF state
  function setResolution(
    AppIdentity memory appIdentity,
    bytes memory finalState
  )
    public
  {
    bytes32 identityHash = appIdentityToHash(appIdentity);

    AppChallenge storage app = appChallenges[identityHash];

    require(
      app.status == AppStatus.OFF ||
      (app.status == AppStatus.DISPUTE && block.number > app.finalizesAt),
      "setResolution called on an app either still ON or in DISPUTE"
    );

    require(
      keccak256(finalState) == app.appStateHash,
      "setResolution called with incorrect witness data of finalState"
    );

    appResolutions[identityHash] = MAppCaller.resolve(
      appIdentity.appDefinition,
      finalState
    );

    appInterpreters[identityHash] = appIdentity.interpreterHash;
  }

}
