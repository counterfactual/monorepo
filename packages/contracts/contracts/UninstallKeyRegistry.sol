pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";


/// @title UninstallKeyRegistry - A global boolean time-lock registry. Maps keys to bool values..
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports a global mapping of sender, timeout and salt based keys to boolean values.
/// A nonce is a mapping from a nonce key to a boolean value which can be set
/// if certain conditions (to be defined later) are satisfied. A nonce is parametrized by the sender, the salt,
/// and the timeout. These parameters determine the nonce key. A bool val can only be set by its sender.
/// When a bool is first set, a timer of length `timeout` starts. During this timeout period, it may
/// only be set to higher values. When the timer expires, the nonce may no longer be set.
contract UninstallKeyRegistry {

  event UninstallKeySet (bytes32 key);

  mapping(bytes32 => bool) public uninstalledKeys;

  /// @notice Set a key as being "uninstalled".
  /// @param salt A salt used to generate the key
  function setKeyAsUninstalled(bytes32 salt)
    external
  {
    bytes32 key = computeKey(msg.sender, salt);

    require(
      uninstalledKeys[key] == false,
      "Key has already been set as uninstalled."
    );

    uninstalledKeys[key] = true;

    emit UninstallKeySet(key);
  }

  /// @notice Computes a unique key for the particular salt and msg.sender
  /// @param sender The message sender that set the nonce
  /// @param salt A salt used to generate the nonce key
  /// @return A unique nonce key derived from the salt and msg.sender
  function computeKey(address sender, bytes32 salt)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(sender, salt));
  }

}
