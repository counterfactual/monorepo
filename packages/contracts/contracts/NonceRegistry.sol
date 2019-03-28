pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";


/// @title NonceRegistry - A global nonce time-lock registry. Maps nonce keys to nonce values.
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports a global mapping of sender, timeout and salt based keys to sequential nonces
/// A nonce is a mapping from a nonce key to a nonce value which can be set
/// if certain conditions (to be defined later) are satisfied. A nonce is parametrized by the sender, the salt,
/// and the timeout. These parameters determine the nonce key. A nonce can only be set by its sender.
/// When a nonce is first set, a timer of length `timeout` starts. During this timeout period, it may
/// only be set to higher values. When the timer expires, the nonce may no longer be set.
contract NonceRegistry {

  event NonceSet (bytes32 key, uint256 nonceValue);

  struct State {
    uint256 nonceValue;
    uint256 finalizesAt;
  }

  mapping(bytes32 => State) public table;

  /// @notice Determine whether a particular key has been set and finalized at a nonce
  /// @param key A unique entry in the mapping, computed using `computeKey`
  /// @param expectedNonceValue The nonce value that the key is expected to be finalized at
  /// @return A boolean referring to whether or not the key has been finalized at the nonce
  function isFinalizedOrHasNeverBeenSetBefore(
    bytes32 key,
    uint256 expectedNonceValue
  )
    external
    view
    returns (bool)
  {
    return (
      (table[key].finalizesAt <= block.number) &&
      (table[key].nonceValue == expectedNonceValue)
    );
  }

  function isNonceSet(bytes32 key) external view returns (bool) {
    return table[key].finalizesAt > 0;
  }

  /// @notice Set a nonce in the mapping.
  /// Trigger the timeout period to begin if the nonce is set for the first time.
  /// @param salt A salt used to generate the nonce key
  /// @param nonceValue A nonce at which to set the computed key's value in the mapping
  function setNonce(uint256 timeout, bytes32 salt, uint256 nonceValue)
    external
  {
    bytes32 key = computeKey(msg.sender, timeout, salt);
    require(
      table[key].nonceValue < nonceValue,
      "Cannot set nonce to a smaller value");
    require(
      table[key].finalizesAt == 0 || block.number < table[key].finalizesAt,
      "Nonce is already finalized"
    );
    table[key].nonceValue = nonceValue;
    if (table[key].finalizesAt == 0) {
      table[key].finalizesAt = block.number + timeout;
    }
    emit NonceSet(key, nonceValue);
  }

  /// @notice Computes a unique key for the particular salt and msg.sender
  /// @param salt A salt used to generate the nonce key
  /// @return A unique nonce key derived from the salt and msg.sender
  function computeKey(address sender, uint256 timeout, bytes32 salt)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(sender, timeout, salt));
  }

}
