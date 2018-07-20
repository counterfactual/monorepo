pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/AddressUtils.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


library StaticCall {

  using AddressUtils for address;

  function staticcall(
    address to,
    bytes data
  )
    public
    view
    returns (bytes)
  {
    require(to.isContract());
    assembly {
      let result := staticcall(gas, to, add(data, 0x20), mload(data), 0, 0)
      let size := returndatasize
      let ptr := mload(0x40)
      returndatacopy(ptr, 0, size)
      switch result case 0 { revert(ptr, size) }
      default { return(ptr, size) }
    }
  }

  function staticcallAddress(address to, bytes data)
    public
    view
    returns (address)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  function staticcallBool(address to, bytes data)
    public
    view
    returns (bool)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  function staticcallBytes(address to, bytes data)
    public
    view
    returns (bytes)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  function staticcallTransferDetails(address to, bytes data)
    public
    view
    returns (Transfer.Details)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  function executeStaticCall(address to, bytes data)
    private
    view
  {
    require(to.isContract());
    assembly {
      let result := staticcall(gas, to, add(data, 0x20), mload(data), 0, 0)
      let size := returndatasize
      let ptr := mload(0x40)
      returndatacopy(ptr, 0, returndatasize)
      if eq(result, 0) { revert(ptr, returndatasize) }
    }
  }

}
