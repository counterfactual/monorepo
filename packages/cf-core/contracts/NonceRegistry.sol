pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";


/// @title NonceRegistry - A global nonce time-lock registry
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports a global mapping of sender and salt based keys to sequential nonces and the ability to consider a key "finalized" or not at a particular nonce
contract NonceRegistry {

  event NonceSet (bytes32 key, uint256 nonce);
  event NonceFinalized (bytes32 key);

  struct State {
    uint256 nonce;
    uint256 finalizesAt;
  }

  uint256 private constant TIMEOUT = 10;

  mapping(bytes32 => State) public table;

  /// @notice Determine whether a particular key has been set and finalized at a nonce
  /// @param key A unique entry in the mapping, computed using `computeKey`
  /// @param nonce The nonce that the key is expected to be finalized at
  /// @return A boolean referring to whether or not the key has been finalized at the nonce
  function isFinalizedAt(bytes32 key, uint256 nonce)
    external
    view
    returns (bool)
  {
    State storage state = table[key];
    require(
      table[key].finalizesAt < block.number,
      "Nonce is not yet finalized"
    );
    return state.nonce == nonce;
  }

  /// @notice Sets a nonce in the mapping and triggers the timeout period to begin
  /// @param salt A unique salt to be applied to the `computeKey` function to get a key
  /// @param nonce A nonce at which to set the computed key's value in the mapping
  function setNonce(bytes32 salt, uint256 nonce) external {
    bytes32 key = computeKey(salt);
    require(table[key].nonce < nonce);
    table[key].nonce = nonce;
    table[key].finalizesAt = block.number + TIMEOUT;
    emit NonceSet(key, nonce);
  }

  /// @notice Finalizes a keys value in the mapping at a particular nonce without a timeout
  /// @param salt A unique salt to be applied to the `computeKey` function to get a key
  function finalizeNonce(bytes32 salt) external {
    bytes32 key = computeKey(salt);
    table[key].finalizesAt = block.number;
    emit NonceFinalized(key);
  }

  /// @notice Computes a unique key for the particular salt and msg.sender
  /// @param salt A unique salt to be applied to the `computeKey` function to get a key
  /// @return A unique key that the salt and msg.sender hash together to form
  function computeKey(bytes32 salt)
    view
    internal
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(msg.sender, salt));
  }

}
