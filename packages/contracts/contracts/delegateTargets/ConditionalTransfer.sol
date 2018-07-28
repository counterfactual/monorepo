pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";
import "@counterfactual/contracts/contracts/Conditional.sol";
import "@counterfactual/contracts/contracts/Registry.sol";
import "@counterfactual/contracts/contracts/NonceRegistry.sol";
import "@counterfactual/contracts/contracts/StateChannel.sol";


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
    uint256 expectedNonce,
    bytes32 stateChannelId,
    Transfer.Terms terms
  )
    public
  {

    require(
      _nonceRegistry.isFinalized(key, expectedNonce),
      "State Channel nonce is either not finalized or finalized at an incorrect nonce"
    );

    address addr = _registry.resolver(stateChannelId);
    StateChannel channel = StateChannel(addr);
    Transfer.Details memory details = channel.getResolution();

    require(
      Transfer.meetsTerms(details, terms),
      "Transfer details do not meet terms"
    );

    details.executeTransfer();
  }

}
