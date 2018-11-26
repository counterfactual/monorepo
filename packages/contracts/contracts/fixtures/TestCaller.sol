pragma solidity 0.5;

import "../lib/StaticCall.sol";


contract TestCaller {
  using StaticCall for address;

  function execStaticCall(
    address to,
    bytes4 selector,
    bytes memory args
  )
    public
    view
    returns (bytes memory)
  {
    bytes memory data = abi.encodePacked(selector, args);
    return to.staticcall_as_bytes(data);
  }

  function execStaticCallBool(
    address to,
    bytes4 selector,
    bytes memory args
  )
    public
    view
    returns (bool)
  {
    bytes memory data = abi.encodePacked(selector, args);
    return to.staticcall_as_bool(data);
  }

}
