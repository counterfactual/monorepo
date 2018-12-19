pragma solidity 0.4.25;

import "../lib/StaticCall.sol";


contract TestCaller {
  using StaticCall for address;

  function execStaticCall(
    address to,
    bytes4 selector,
    bytes arguments
  )
    public
    view
    returns (bytes)
  {
    bytes memory data = abi.encodePacked(selector, arguments);
    return to.staticcall_as_bytes(data);
  }

  function execStaticCallBool(
    address to,
    bytes4 selector,
    bytes arguments
  )
    public
    view
    returns (bool)
  {
    bytes memory data = abi.encodePacked(selector, arguments);
    return to.staticcall_as_bool(data);
  }

}
