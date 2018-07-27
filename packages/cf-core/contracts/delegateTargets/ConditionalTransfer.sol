pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Transfer.sol";
import "@counterfactual/core/contracts/Conditional.sol";
import "@counterfactual/core/contracts/Registry.sol";
import "@counterfactual/core/contracts/NonceRegistry.sol";
import "@counterfactual/core/contracts/StateChannel.sol";


contract ConditionalTransfer is Conditional {

  using Transfer for Transfer.Details;

  Registry public _registry;
  NonceRegistry public _nonceRegistry;

  constructor(Registry registry, NonceRegistry nonceRegistry) {
    _registry = registry;
    _nonceRegistry = nonceRegistry;
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
    address addr = _registry.resolver(stateChannelId);
    StateChannel channel = StateChannel(addr);
    Transfer.Details memory details = channel.getResolution();
    require(Transfer.meetsTerms(details, terms), "Transfer details do not meet terms");
    require(_nonceRegistry.isFinalizedAt(key, nonce), "State Channel nonce is not finalized");
    details.executeTransfer();
  }

}
