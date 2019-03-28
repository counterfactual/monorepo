pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/Transfer.sol";


contract MAppRegistryCore {

  using Transfer for Transfer.Transaction;

  // A mapping of appIdentityHash to AppChallenge structs which represents
  // the current on-chain status of some particular applications state.
  mapping (bytes32 => LibStateChannelApp.AppChallenge) public appChallenges;

  // A mapping of appIdentityHash to Transaction structs which represents
  // the *final* resolution of a particular application
  mapping (bytes32 => Transfer.Transaction) public appResolutions;

  modifier doTermsCheck(
    bytes memory terms,
    bytes32 termsHash
  ) {
    require(
      keccak256(terms) == termsHash,
      "Call to AppRegistry included mismatched terms and termsHash"
    );
    _;
  }

  /// @notice Compute a unique hash for a single instance of an App
  /// @param appIdentity An `AppIdentity` struct that encodes all unqiue info for an App
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
  /// @param nonce The nonce corresponding to the version of the state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @return A bytes32 hash of the arguments encoded with the signing keys for the channel
  function computeAppChallengeHash(
    bytes32 identityHash,
    bytes32 appStateHash,
    uint256 nonce,
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
        nonce,
        timeout,
        appStateHash
      )
    );
  }

  /// @notice Compute a unique hash for an action used in this channel application
  /// @param turnTaker The address of the user taking the action
  /// @param previousState The hash of a state this action is being taken on
  /// @param action The ABI encoded version of the action being taken
  /// @param setStateNonce The nonce of the state this action is being taken on
  /// @param disputeNonce A nonce corresponding to how many actions have been taken on the
  ///                     state since a new state has been unanimously agreed by signing keys.
  /// @return A bytes32 hash of the arguments
  function computeActionHash(
    address turnTaker,
    bytes32 previousState,
    bytes memory action,
    uint256 setStateNonce,
    uint256 disputeNonce
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
        setStateNonce,
        disputeNonce
      )
    );
  }

}
