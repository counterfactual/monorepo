pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";


contract NonceRegistry {

  event NonceSet (bytes32 key, uint256 nonce);
  event NonceFinalized (bytes32 key);

  struct State {
    uint256 nonce;
    uint256 finalizesAt;
  }

  uint256 private constant TIMEOUT = 10;

  mapping(bytes32 => State) public table;

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

  function setNonce(bytes32 salt, uint256 nonce) external {
    bytes32 key = computeKey(salt);
    require(table[key].nonce < nonce);
    table[key].nonce = nonce;
    table[key].finalizesAt = block.number + TIMEOUT;
    emit NonceSet(key, nonce);
  }

  function finalizeNonce(bytes32 salt) external {
    bytes32 key = computeKey(salt);
    table[key].finalizesAt = block.number;
    emit NonceFinalized(key);
  }

  function computeKey(bytes32 salt)
    view
    internal
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(msg.sender, salt));
  }

}
