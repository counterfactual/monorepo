pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";


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
