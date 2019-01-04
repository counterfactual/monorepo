pragma solidity 0.5;


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

  // An interface to the App Definition used to make function calls to it
  struct AppInterface {
    address addr;
    bytes4 getTurnTaker;
    bytes4 applyAction;
    bytes4 resolve;
    bytes4 isStateTerminal;
  }

  // A minimal structure that uniquely identifies a single instance of an App
  struct AppIdentity {
    address owner;
    address[] signingKeys;
    bytes32 appInterfaceHash;
    bytes32 termsHash;
    uint256 defaultTimeout;
  }

  // A structure representing the state of an AppInstance from POV of the blockchain
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
