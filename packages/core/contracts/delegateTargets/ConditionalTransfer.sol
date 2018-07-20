pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Transfer.sol";
import "@counterfactual/core/contracts/lib/Conditional.sol";
import "@counterfactual/core/contracts/Registry.sol";
import "@counterfactual/core/contracts/StateChannel.sol";


contract ConditionalTransfer is Conditional {

  using Transfer for Transfer.Details;

  Registry public registry;

  constructor(Registry _registry) {
    registry = _registry;
  }

  function executeSimpleConditionalTransfer(
    Condition condition,
    Transfer.Details memory details
  )
    public
  {
    require(Conditional.isSatisfied(condition));
    details.executeTransfer();
  }

  // function executeStateChannelConditionalTransfer(
  //   Conditional.Condition[] conditions,
  //   bytes32 appIdentifier,
  //   Transfer.Terms terms
  // )
  //   public
  // {
  //   address addr = registry.resolve(appIdentifier);
  //   StateChannel app = StateChannel(addr);
  //   Transfer.Details memory details = app.getResolution(terms);
  //   executeSimpleConditionalTransfer(conditions, details, terms);
  // }

}
