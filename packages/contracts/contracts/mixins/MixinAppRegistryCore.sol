pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";

import "./MAppRegistryCore.sol";


/// @title MixinAppRegistryCore
/// @author Liam Horne - <liam@l4v.io>
/// @notice Core functionality and utilities for the AppRegistry
contract MixinAppRegistryCore is MAppRegistryCore {

  /// @notice A getter function for the current AppChallenge state
  /// @param identityHash The unique hash of an `AppIdentity`
  /// @return A `AppChallenge` object representing the state of the on-chain challenge
  function getAppChallenge(bytes32 identityHash)
    external
    view
    returns (LibStateChannelApp.AppChallenge memory)
  {
    return appChallenges[identityHash];
  }

  /// @notice Checks whether or not some application's state is OFF or timed out
  /// @param identityHash The unique hash of an `AppIdentity`
  /// @return A boolean indicator
  function isStateFinalized(bytes32 identityHash)
    external
    view
    returns (bool)
  {
    return (
      appChallenges[identityHash].status == LibStateChannelApp.AppStatus.OFF ||
      (
        appChallenges[identityHash].status == LibStateChannelApp.AppStatus.IN_CHALLENGE &&
        appChallenges[identityHash].finalizesAt <= block.number
      )
    );
  }

  /// @notice A getter function for the outcome if one is set
  /// @param identityHash The unique hash of an `AppIdentity`
  /// @return A `Transfer.Transaction` object representing the outcome of the channel
  function getOutcome(bytes32 identityHash)
    external
    view
    returns (bytes memory)
  {
    return appOutcomes[identityHash];
  }

}
