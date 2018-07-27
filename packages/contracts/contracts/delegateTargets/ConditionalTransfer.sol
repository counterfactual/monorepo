pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";
import "@counterfactual/contracts/contracts/Conditional.sol";
import "@counterfactual/contracts/contracts/Registry.sol";
import "@counterfactual/contracts/contracts/StateChannel.sol";


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

  function executeStateChannelConditionalTransfer(
    Conditional.Condition[] conditions,
    bytes32 appIdentifier,
    Transfer.Terms terms
  )
    public
  {
    address addr = registry.resolver(appIdentifier);
    StateChannel app = StateChannel(addr);
    Transfer.Details memory details = app.getResolution();
    require(Transfer.meetsTerms(details, terms));
    for (uint256 i = 0; i < conditions.length; i++ ) {
      require(Conditional.isSatisfied(conditions[i]));
    }
    details.executeTransfer();
  }

}
