pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Disputable.sol";


contract ExampleDisputableState {

  struct DynamicStruct {
    uint8[] a;
  }

  using Disputable for Disputable.State;

  Disputable.State public stateBytes;
  Disputable.State public stateUint8;
  Disputable.State public stateStruct;

  function createFromStateHash(bytes32 proof, uint256 timeout)
    public
    pure
    returns (Disputable.State)
  {
    return Disputable.createFromStateHash(proof, timeout);
  }

  function newBytes(bytes state, uint256 timeout)
    external
    returns (Disputable.State)
  {
    stateBytes = createFromStateHash(keccak256(state), timeout);
    return stateBytes;
  }

  function newUint8(uint8 state, uint256 timeout)
    external
    returns (Disputable.State)
  {
    stateUint8 = createFromStateHash(keccak256(abi.encodePacked(state)), timeout);
    return stateUint8;
  }

  function newStruct(DynamicStruct state, uint256 timeout)
    public
    returns (Disputable.State)
  {
    stateStruct = createFromStateHash(keccak256(abi.encode(state)), timeout);
    return stateStruct;
  }

  function setBytes(bytes state, uint nonce) external {
    stateBytes.set(
      keccak256(state),
      nonce,
      10
    );
  }

  function setUint8(uint8 state, uint nonce) external {
    stateUint8.set(
      keccak256(abi.encodePacked(state)),
      nonce,
      10
    );
  }

  // NOTE: Cannot mark function with struct in calldata as external
  function setStruct(DynamicStruct state, uint nonce) public {
    stateStruct.set(
      keccak256(abi.encode(state)),
      nonce,
      10
    );
  }

  function finalizeBytes() external {
    stateBytes.finalize();
  }

  function finalizeUint8() external {
    stateUint8.finalize();
  }

  function finalizeStruct() external {
    stateStruct.finalize();
  }

  function resolveBytes() external{
    stateBytes.resolve();
  }

  function resolveUint8() external{
    stateUint8.resolve();
  }

  function resolveStruct() external{
    stateStruct.resolve();
  }

  function isSettledBytes() external view returns (bool) {
    return stateBytes.settled();
  }

  function isSettledUint8() external view returns (bool) {
    return stateUint8.settled();
  }

  function isSettledStruct() external view returns (bool) {
    return stateStruct.settled();
  }

}
