pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";


contract MChallengeRegistryCore {

  // A mapping of appIdentityHash to AppChallenge structs which represents
  // the current on-chain status of some particular application's state.
  mapping (bytes32 => LibStateChannelApp.AppChallenge) public appChallenges;

  // A mapping of appIdentityHash to outcomes
  mapping (bytes32 => bytes) public appOutcomes;

  /// @notice Compute a unique hash for a single instance of an App
  /// @param appIdentity An `AppIdentity` struct that encodes all unique info for an App
  /// @return A bytes32 hash of the AppIdentity
  function appIdentityToHash(
    LibStateChannelApp.AppIdentity memory appIdentity
  )
    internal
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encode(appIdentity.channelNonce, appIdentity.participants)
    );
  }

  /// @notice Compute a unique hash for the state of a channelized app instance
  /// @param identityHash The unique hash of an `AppIdentity`
  /// @param appStateHash The hash of the app state to be signed
  /// @param versionNumber The versionNumber corresponding to the version of the state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @return A bytes32 hash of the RLP encoded arguments
  function computeAppChallengeHash(
    bytes32 identityHash,
    bytes32 appStateHash,
    uint256 versionNumber,
    uint256 timeout
  )
    internal
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        identityHash,
        versionNumber,
        timeout,
        appStateHash
      )
    );
  }

  /// @notice Compute a unique hash for an action used in this channel application
  /// @param turnTaker The address of the user taking the action
  /// @param previousState The hash of a state this action is being taken on
  /// @param action The ABI encoded version of the action being taken
  /// @param versionNumber The versionNumber of the state this action is being taken on
  /// @return A bytes32 hash of the arguments
  function computeActionHash(
    address turnTaker,
    bytes32 previousState,
    bytes memory action,
    uint256 versionNumber
  )
    internal
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        turnTaker,
        previousState,
        action,
        versionNumber
      )
    );
  }

}
