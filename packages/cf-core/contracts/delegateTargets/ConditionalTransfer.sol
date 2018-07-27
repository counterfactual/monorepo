pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Transfer.sol";
import "@counterfactual/core/contracts/Conditional.sol";
import "@counterfactual/core/contracts/Registry.sol";
import "@counterfactual/core/contracts/NonceRegistry.sol";
import "@counterfactual/core/contracts/StateChannel.sol";


contract ConditionalTransfer is Conditional {

  using Transfer for Transfer.Details;

  Registry public registry;
  NonceRegistry public nonceRegistry;

  constructor(Registry _registry, NonceRegistry _nonceRegistry) {
    registry = _registry;
    nonceRegistry = _nonceRegistry;
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
    bytes32 key,
    uint256 nonce,
    bytes32 stateChannelId,
    Transfer.Terms terms
  )
    public
  {
    address addr = registry.resolver(stateChannelId);
    StateChannel channel = StateChannel(addr);
    Transfer.Details memory details = channel.getResolution();
    require(Transfer.meetsTerms(details, terms), "Transfer details do not meet terms");
    require(nonceRegistry.isFinalizedAt(key, nonce), "State Channel nonce is not finalized");
    details.executeTransfer();
  }

}
