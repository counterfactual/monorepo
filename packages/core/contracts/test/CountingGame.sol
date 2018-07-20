pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/StaticCall.sol";


contract CountingGame {

  using StaticCall for address;

  struct State {
    uint8 count;
  }

  function isValid(State s1, State s2) public pure returns (bool) {
    return s2.count == s1.count + 1;
  }

  function validTransition(bytes s1, bytes s2) public view returns (bool) {
    // FIXME: This is a short-term bandaid fix to compromise for the lack
    // of an `abi.decode` method in Solidity. Goal is to get to this:
    //
    // State oldState = abi.decode(s1, State)
    // State newState = abi.decode(s2, State)
    // return newState.count == oldState.count + 1;
    bytes memory data = abi.encodePacked(this.isValid.selector, s1, s2);
    return address(this).staticcallBool(data);
  }

}
