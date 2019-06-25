pragma solidity 0.5.10;


/// @title LibStateChannelApp
/// @author Liam Horne - <liam@l4v.io>
/// @notice Contains the structures and enums needed for the ChallengeRegistry
contract LibStateChannelApp {

  // The status of a challenge in the ChallengeRegistry
  enum ChallengeStatus {
    NO_CHALLENGE,
    CHALLENGE_IS_OPEN,
    CHALLENGE_WAS_FINALIZED
  }

  // A minimal structure that uniquely identifies a single instance of an App
  struct AppIdentity {
    address owningMultisig;
    address[] signingKeys;
    address appDefinition;
    uint256 defaultTimeout;
  }

  // A structure representing the state of a CounterfactualApp instance from the POV of the blockchain
  // NOTE: AppChallenge is the overall state of a channelized app instance,
  // appStateHash is the hash of a state specific to the CounterfactualApp (e.g. chess position)
  struct AppChallenge {
    ChallengeStatus status;
    address latestSubmitter;
    bytes32 appStateHash;
    uint256 challengeCounter;
    uint256 finalizesAt;
    uint256 versionNumber;
  }

  /*
  A set of amounts of token. For instance,
  - "1 ETH" is a PileOfTokens
  - "1 DAI and 2 MKR" is a PileOfTokens
  Generalizes Turbo/Nitro's "holdings" structure, which is a uint256.
  */
  struct PileOfTokens {
    address tokenAddress;
    uint256 amount;
  }

  /// Destination is either an address or an appIdentityHash
  struct Allocation {
    bytes32[] destinations;
    PileOfTokens[] balances;
  }

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
    return keccak256(abi.encode(appIdentity));
  }

  /// @notice Compute a unique hash for the state of a channelized app instance
  /// @param identityHash The unique hash of an `AppIdentity`
  /// @param appStateHash The hash of the app state to be signed
  /// @param versionNumber The versionNumber corresponding to the version of the state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @return A bytes32 hash of the arguments encoded with the signing keys for the channel
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
