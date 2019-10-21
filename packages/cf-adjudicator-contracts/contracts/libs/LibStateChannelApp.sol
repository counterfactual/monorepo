pragma solidity 0.5.11;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";


/// @title LibStateChannelApp
/// @author Liam Horne - <liam@l4v.io>
/// @notice Contains the structures and enums needed for the ChallengeRegistry
contract LibStateChannelApp {

  using ECDSA for bytes32;

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
    address latestSubmitter;
    bytes32 appStateHash;
    uint128 challengeCounter;
    uint128 versionNumber;
    uint248 finalizesAt;
    ChallengeStatus status;
  }

  /// @dev Verifies signatures given the signer addresses
  /// @param signatures message `txHash` signature
  /// @param txHash operation ethereum signed message hash
  /// @param signers addresses of all signers in order
  function verifySignatures(
    bytes[] memory signatures,
    bytes32 txHash,
    address[] memory signers
  )
    public
    pure
    returns (bool)
  {
    require(
      signers.length == signatures.length,
      "Signers and signatures should be of equal length"
    );
    address lastSigner = address(0);
    for (uint256 i = 0; i < signers.length; i++) {
      require(
        signers[i] == txHash.recover(signatures[i]),
        "Invalid signature"
      );
      require(signers[i] > lastSigner, "Signers not in alphanumeric order");
      lastSigner = signers[i];
    }
    return true;
  }

}
