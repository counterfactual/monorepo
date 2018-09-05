pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";
import "../Conditional.sol";
import "../Registry.sol";
import "../NonceRegistry.sol";
import "../StateChannel.sol";


/// @title ConditionalTransfer - A conditional transfer contract
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract ConditionalTransfer is Conditional {

  using Transfer for Transfer.Details;

  /// Unused
  function executeSimpleConditionalTransfer(
    Condition condition,
    Transfer.Details memory details
  )
    public
  {
    require(Conditional.isSatisfied(condition));
    details.executeTransfer();
  }

  /// @notice Execute a fund transfer for a state channel in a finalized state
  /// @param key The key; fixed for a given state channel
  /// @param expectedR The expected r-nonce in the nonce registry
  /// @param channelCfAddress Counterfactual address of the state channel contract
  /// @param terms The pre-agreed upon terms of the funds transfer
  function executeStateChannelConditionalTransfer(
    address registry,
    address nonceRegistry,
    bytes32 key,
    uint256 expectedR,
    uint8 idx,
    bytes32 channelCfAddress,
    Transfer.Terms terms
  )
    public
    view
  {
    require(
      NonceRegistry(nonceRegistry).isFinalized120i(key, expectedR, idx),
      "State Channel nonce is either not finalized or finalized at an incorrect nonce"
    );

    address channelAddr = Registry(registry).resolver(channelCfAddress);
    StateChannel channel = StateChannel(channelAddr);
    Transfer.Details memory details = channel.getResolution();

    require(
      Transfer.meetsTerms(details, terms),
      "Transfer details do not meet terms"
    );

    details.executeTransfer();
  }

  function executeFreeBalanceConditionalTransfer(
    address nonceRegistry,
    bytes32 key,
    uint256 expectedR,
    Transfer.Terms terms,
    Transfer.Details details
  )
    public
    view
  {
    require(
      NonceRegistry(nonceRegistry).isFinalized128(key, expectedR),
      "State Channel nonce is either not finalized or finalized at an incorrect nonce"
    );

    require(
      Transfer.meetsTerms(details, terms),
      "Transfer details do not meet terms"
    );

    details.executeTransfer();
  }

}
