pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";

import "./NonceRegistry.sol";
import "./AppRegistry.sol";


/// @title StateChannelTransaction
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract StateChannelTransaction {

  using Transfer for Transfer.Transaction;

  /// @notice Execute a fund transfer for a state channel app in a finalized state
  /// @param uninstallKey The key in the nonce registry
  /// @param appIdentityHash AppIdentityHash to be resolved
  /// @param terms The pre-agreed upon terms of the funds transfer
  function executeAppConditionalTransaction(
    AppRegistry appRegistry,
    NonceRegistry nonceRegistry,
    bytes32 uninstallKey,
    uint256 rootNonceExpectedValue,
    bytes32 appIdentityHash,
    Transfer.Terms memory terms
  )
    public
  {
    require(
      nonceRegistry.isFinalizedOrHasNeverBeenSetBefore(
        // TODO: Allow ability to set timeout off-chain
        nonceRegistry.computeKey(address(this), 100, 0x0),
        rootNonceExpectedValue
      ),
      "Root nonce not finalized or finalized at an incorrect value"
    );

    require(
      !nonceRegistry.isFinalizedOrHasNeverBeenSetBefore(uninstallKey, 1),
      "App has been uninstalled"
    );

    require(
      appRegistry.isStateFinalized(appIdentityHash),
      "App is not finalized yet"
    );

    Transfer.Transaction memory txn = appRegistry.getResolution(
      appIdentityHash
    );

    require(
      Transfer.meetsTerms(txn, terms),
      "Transfer details do not meet terms"
    );

    txn.execute();
  }


}
