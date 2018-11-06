pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


contract ExampleCondition {

  struct State {
    bool ret;
  }

  function isSatisfiedNoParam()
    public
    pure
    returns (bytes)
  {
    return abi.encode(true);
  }

  function isSatisfiedParam(State state)
    public
    pure
    returns (bytes)
  {
    return abi.encode(state.ret);
  }

}
