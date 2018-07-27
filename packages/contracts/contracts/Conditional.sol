pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/StaticCall.sol";


contract Conditional {

  using StaticCall for address;

  struct Condition {
    address to;
    bytes4 selector;
    bytes parameters;
    bytes32 expectedValueHash;
    bool onlyCheckForSuccess;
  }

  function isSatisfied(Condition memory condition)
    public
    view
    returns (bool)
  {
    if (condition.onlyCheckForSuccess) {
      return assertNotFails(condition);
    } else {
      return assertReturnsExpectedResult(condition);
    }
  }

  function assertNotFails(Condition condition)
    private
    returns (bool)
  {
    condition.to.staticcall_as_bytes(
      abi.encodePacked(
        condition.selector,
        condition.parameters
      )
    );
    return true; // TODO: Need better way of cheaply checking
  }

  function assertReturnsExpectedResult(Condition condition)
    private
    returns (bool)
  {
    bytes memory ret = condition.to.staticcall_as_bytes(
      abi.encodePacked(
        condition.selector,
        condition.parameters
      )
    );
    return keccak256(ret) == condition.expectedValueHash;
  }

}
