pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";
import "../libs/Transfer.sol";


contract MAppRegistryCore {

  using Transfer for Transfer.Transaction;

  // A mapping of AppInstanceIds to AppChallenge structs which represents
  // the current on-chain status of some particular applications state.
  mapping (bytes32 => LibStateChannelApp.AppChallenge) public appStates;

  // A mapping of AppInstanceIds to Transaction structs which represents
  // the *final* resolution of a particular application
  mapping (bytes32 => Transfer.Transaction) public appResolutions;

  // TODO: docs
  modifier doAppInterfaceCheck(
    LibStateChannelApp.AppInterface appInterface,
    bytes32 appInterfaceHash
  ) {
    // TODO: This is inefficient from a gas point of view since we could just include
    // the hash of appInterface in the call to computeAppIdentityHash. Cleanup in the fututre.
    require(
      keccak256(abi.encode(appInterface)) == appInterfaceHash,
      "Call to AppRegistry included mismatched appInterface and appInterfaceHash"
    );
    _;
  }

  modifier doTermsCheck(
    bytes terms,
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
  function computeAppIdentityHash(LibStateChannelApp.AppIdentity appIdentity)
    internal
    pure
    returns (bytes32)
  {
    return keccak256(abi.encode(appIdentity));
  }

  /// @notice Compute a unique hash for a state of this state channel and application
  /// @param _id The unique hash of an `AppIdentity`
  /// @param appStateHash The hash of a state to be signed
  /// @param nonce The nonce corresponding to the version of the state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @return A bytes32 hash of the arguments encoded with the signing keys for the channel
  function computeStateHash(
    bytes32 _id,
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
        _id,
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
    bytes action,
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
