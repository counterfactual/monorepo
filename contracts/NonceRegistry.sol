pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";


/// @title NonceRegistry - A global nonce time-lock registry. Maps nonce keys to nonce values.
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
  /// @param expectedNonce The nonce that the key is expected to be finalized at
  /// @return A boolean referring to whether or not the key has been finalized at the nonce
  function isFinalized(bytes32 key, uint256 expectedNonce)
    external
    view
    returns (bool)
  {
    State storage state = table[key];
    require(
      table[key].finalizesAt <= block.number,
      "Nonce is not yet finalized"
    );
    require(
      state.nonce == expectedNonce,
      "Nonce is not equal to expectedNonce"
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
      getFirstNBits(state.nonce, 120) == getFirstNBits(expectedR, 120),
      "nonce[0:120] is not equal to expectedR[0:120]"
    );
    require(
      bitSet(state.nonce, 128 + i),
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
      getFirstNBits(state.nonce, 128) == getFirstNBits(expectedR, 128),
      "Nonce is not equal to expectedNonce"
    );
    return true;
  }

  /// @notice Set a nonce in the mapping and triggers the timeout period to begin
  /// @param salt A salt used to generate the nonce key
  /// @param nonce A nonce at which to set the computed key's value in the mapping
  function setNonce(bytes32 salt, uint256 nonce) external {
    bytes32 key = computeKey(salt);
    require(
      table[key].nonce < nonce,
      "Cannot set a nonce lower than the value currently set"
    );
    table[key].nonce = nonce;
    table[key].finalizesAt = block.number + TIMEOUT;
    emit NonceSet(key, nonce);
  }

  /// @notice Finalize a keys value in the mapping at a particular nonce without a timeout
  /// @param salt A salt used to generate the nonce key
  function finalizeNonce(bytes32 salt) external {
    bytes32 key = computeKey(salt);
    table[key].finalizesAt = block.number;
    emit NonceFinalized(key);
  }

  /// @notice Computes a unique key for the particular salt and msg.sender
  /// @param salt A salt used to generate the nonce key
  /// @return A unique nonce key derived from the salt and msg.sender
  function computeKey(bytes32 salt)
    view
    internal
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(msg.sender, salt));
  }

}
