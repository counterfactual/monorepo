pragma solidity 0.5.3;
pragma experimental "ABIEncoderV2";


contract ExampleCondition {

  struct State {
    bool ret;
  }

  function isSatisfiedNoParam()
    public
    pure
    returns (bytes memory)
  {
    return abi.encode(true);
  }

  function isSatisfiedParam(State memory state)
    public
    pure
    returns (bytes memory)
  {
    return abi.encode(state.ret);
  }

}
