pragma solidity 0.4.24;

import "@counterfactual/core/contracts/lib/StaticCall.sol";


contract TestCaller {
  using StaticCall for address;

  function execStaticCall(
    address to,
    bytes4 selector,
    bytes calldata
  )
    public
    view
    returns (bytes)
  {
    bytes memory data = abi.encodePacked(selector, calldata);
    return to.staticcall_as_bytes(data);
  }

  function execStaticCallBool(
    address to,
    bytes4 selector,
    bytes calldata
  )
    public
    view
    returns (bool)
  {
    bytes memory data = abi.encodePacked(selector, calldata);
    return to.staticcall_as_bool(data);
  }

}
