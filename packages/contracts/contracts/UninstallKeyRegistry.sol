pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";


/// @title UninstallKeyRegistry - A global boolean time-lock registry. Maps keys to bool values..
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports a global mapping of sender and salt based keys to boolean values.
/// Allows for setting a key from `false` to `true` one time
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
