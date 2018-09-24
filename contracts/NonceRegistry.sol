pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";


/// @title NonceRegistry - A global nonce time-lock registry. Maps nonce keys to nonce values.
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports a global mapping of sender, timeout and salt based keys to sequential nonces
/// A nonce (aka "dependency nonce") is a mapping from a nonce key to a nonce value which can be set 
/// under certain circumstances (to be defined later). A nonce is parametrized by the sender, the salt,
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
  function isFinalized(bytes32 key, uint256 expectedNonceValue)
    external
    view
    returns (bool)
  {
    require(
      table[key].finalizesAt <= block.number,
      "Nonce is not yet finalized"
    );
    require(
      table[key].nonceValue == expectedNonceValue,
      "Nonce value is not equal to expected nonce value"
    );
    return true;
  }

  /// @notice Return the N highest-order bits from the input.
  /// @param input A uint256 treated as a bitfield from which to get the high-order bits
  /// @param N the number of bits to get from input
  /// @return A uint256 where the N highest-order bits are the same as in input, and
  /// the other bits are 0
  function getFirstNBits(uint256 input, uint8 N) public pure returns (uint256) {
    uint256 nOnes = uint256(2) ** N - 1;
    uint256 mask = nOnes << (uint8(256) - N); // uint8(256) == uint8(0)
    return uint256(bytes32(input) & bytes32(mask));
  }

  /// @return Whether the Nth highest-order bit in input is set
  function bitSet(uint256 self, uint8 index) public pure returns (bool) {
    return self >> index & 1 == 1;
  }

  /// @return
  ///   - nonce[0:120] == expectedR
  ///   - nonce[128+i] == 1
  function isFinalized120i(bytes32 key, uint256 expectedR, uint8 i) public view returns (bool) {
    State storage state = table[key];

    require(
      table[key].finalizesAt <= block.number,
      "Nonce is not yet finalized"
    );
    require(
      getFirstNBits(state.nonceValue, 120) == getFirstNBits(expectedR, 120),
      "nonce[0:120] is not equal to expectedR[0:120]"
    );
    require(
      bitSet(state.nonceValue, 128 + i),
      "nonce[128+i] is not equal to 1"
    );
    return true;
  }

  /// @return
  ///   - nonce[0:128] == expectedR
  function isFinalized128(bytes32 key, uint256 expectedR) public view returns (bool) {
    State storage state = table[key];

    require(
      table[key].finalizesAt <= block.number,
      "Nonce is not yet finalized"
    );
    require(
      getFirstNBits(state.nonceValue, 128) == getFirstNBits(expectedR, 128),
      "Nonce is not equal to expectedNonce"
    );
    return true;
  }

  function isNonceSet(bytes32 key) external view returns (bool) {
    return table[key].finalizesAt > 0;
  }

  /// @notice Set a nonce in the mapping.
  /// Trigger the timeout period to begin if the nonce is set for the first time.
  /// @param salt A salt used to generate the nonce key
  /// @param nonceValue A nonce at which to set the computed key's value in the mapping
  function setNonce(uint256 timeout, bytes32 salt, uint256 nonceValue) external {
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
    view
    internal
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(sender, timeout, salt));
  }

}
