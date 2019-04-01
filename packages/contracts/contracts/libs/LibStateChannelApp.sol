pragma solidity 0.5.7;


/// @title LibStateChannelApp
/// @author Liam Horne - <liam@l4v.io>
/// @notice Contains the structures and enums needed for the AppRegistry
contract LibStateChannelApp {

  // The mode that the App is currently in from POV of the blockchain
  enum AppStatus {
    ON,
    DISPUTE,
    OFF
  }

  // A minimal structure that uniquely identifies a single instance of an App
  struct AppIdentity {
    address owner;
    address[] signingKeys;
    address appDefinitionAddress;
    bytes32 termsHash;
    uint256 defaultTimeout;
  }

  // A structure representing the state of an AppInstance from POV of the blockchain
  // NOTE: AppChallenge is the overall state of an channelized app instance,
  // AppState refers to the states specific to the AppDefinition(e.g. chess position)
  struct AppChallenge {
    AppStatus status;
    address latestSubmitter;
    bytes32 appStateHash;
    uint256 disputeCounter;
    uint256 disputeNonce;
    uint256 finalizesAt;
    uint256 nonce;
  }

}
