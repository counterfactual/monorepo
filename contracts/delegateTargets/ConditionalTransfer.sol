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

  using Transfer for Transfer.Transaction;

  function executeSimpleConditionalTransfer(
    Condition condition,
    Transfer.Transaction memory tx
  )
    public
  {
    require(Conditional.isSatisfied(condition));
    tx.execute();
  }

  /// @notice Execute a fund transfer for a state channel in a finalized state
  /// @param key The key in the nonce registry
  /// @param expectedNonce The expected nonce in the nonce registry
  /// @param channelCfAddress Counterfactual address of the state channel contract
  /// @param terms The pre-agreed upon terms of the funds transfer
  function executeStateChannelConditionalTransfer(
    address registry,
    address nonceRegistry,
    bytes32 key,
    uint256 expectedNonce,
    bytes32 channelCfAddress,
    Transfer.Terms terms
  )
    public
  {
    require(
      NonceRegistry(nonceRegistry).isFinalized(key, expectedNonce),
      "State Channel nonce is either not finalized or finalized at an incorrect nonce"
    );

    address channelAddr = Registry(registry).resolver(channelCfAddress);
    StateChannel channel = StateChannel(channelAddr);
    Transfer.Transaction memory tx = channel.getResolution();

    require(
      Transfer.meetsTerms(tx, terms),
      "Transfer details do not meet terms"
    );

    tx.execute();
  }

}
