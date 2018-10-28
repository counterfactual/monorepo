pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "openzeppelin-eth/contracts/utils/Address.sol";
import "../lib/Transfer.sol";


/// @title StaticCall - A library wrapper around the STATICALL opcode
/// @author Liam Horne - <liam@l4v.io>
/// @notice This contracts purpose is to make it easy for contracts to make static function
/// calls to contracts with unknown ABIs without exposing assembly code in the contract.
library StaticCall {

  using Address for address;

  /// @notice Execute a STATICCALL without regard for the return value
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  /// @return A boolean indicating whether or not the transaction didn't fail
  function staticcall_no_error(address to, bytes data)
    public
    view
    returns (bool success)
  {
    require(to.isContract(), "StaticCall to address is not a contract.");
    assembly {
      let success := staticcall(gas, to, add(data, 0x20), mload(data), 0, 0)
    }
  }

  /// @notice Execute a STATICCALL expecting a boolean return type
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  /// @return The return data of the static call encoded as a boolean
  function staticcall_as_bool(address to, bytes data)
    public
    view
    returns (bool)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  /// @notice Execute a STATICCALL expecting a uint256 return type
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  /// @return The return data of the static call encoded as a uint256
  function staticcall_as_uint256(address to, bytes data)
    public
    view
    returns (uint256)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  /// @notice Execute a STATICCALL expecting a address return type
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  /// @return The return data of the static call encoded as a address
  function staticcall_as_address(address to, bytes data)
    public
    view
    returns (address)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  /// @notice Execute a STATICCALL expecting a bytes return type
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  /// @return The return data of the static call encoded as a bytes
  function staticcall_as_bytes(address to, bytes data)
    public
    view
    returns (bytes)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  /// @notice Execute a STATICCALL expecting a Transfer.Transaction return type
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  /// @return The return data of the static call encoded as a Transfer.Transaction
  function staticcall_as_TransferDetails(address to, bytes data)
    public
    view
    returns (Transfer.Transaction)
  {
    executeStaticCall(to, data);
    assembly { return(mload(0x40), returndatasize) }
  }

  /// @notice The internal method that executes the STATICCALL
  /// @param to The address the call is being made to
  /// @param data The calldata being sent to the contract being static called
  function executeStaticCall(address to, bytes data)
    private
    view
  {
    require(to.isContract(), "Attempted to make a static call on non-conract address");
    assembly {
      let result := staticcall(gas, to, add(data, 0x20), mload(data), 0, 0)
      let size := returndatasize
      let ptr := mload(0x40)
      returndatacopy(ptr, 0, returndatasize)
      if eq(result, 0) { revert(ptr, returndatasize) }
    }
  }

}
