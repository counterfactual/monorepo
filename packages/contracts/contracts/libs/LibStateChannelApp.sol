pragma solidity 0.5.10;


/// @title LibStateChannelApp
/// @author Liam Horne - <liam@l4v.io>
/// @notice Contains the structures and enums needed for the ChallengeRegistry
contract LibStateChannelApp {

  // The status of a challenge in the ChallengeRegistry
  enum ChallengeStatus {
    NO_CHALLENGE,
    FINALIZES_AFTER_DEADLINE,
    EXPLICITLY_FINALIZED
  }

  // A minimal structure that uniquely identifies a single instance of an App
  struct AppIdentity {
    uint256 channelNonce;
    address[] participants;
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

}
