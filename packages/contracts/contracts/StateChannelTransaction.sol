pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";
import "./libs/LibCondition.sol";

import "./ContractRegistry.sol";
import "./NonceRegistry.sol";
import "./AppRegistry.sol";


/// @title ConditionalTransaction - A conditional transfer contract
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract StateChannelTransaction is LibCondition {

  using Transfer for Transfer.Transaction;

  /// @notice Execute a fund transfer for a state channel app in a finalized state
  /// @param uninstallKey The key in the nonce registry
  /// @param appCfAddress Counterfactual address of the app contract
  /// @param terms The pre-agreed upon terms of the funds transfer
  function executeAppConditionalTransaction(
    address appRegistryAddress,
    address nonceRegistryAddress,
    bytes32 uninstallKey,
    bytes32 appCfAddress,
    Transfer.Terms terms
  )
    public
  {
    NonceRegistry nonceRegistry = NonceRegistry(nonceRegistryAddress);
    AppRegistry appRegistry = AppRegistry(appRegistryAddress);

    require(
      !nonceRegistry.isFinalized(uninstallKey, 1),
      "App has been uninstalled"
    );

    // require(
    //   appRegistry.isFinalized(appCfAddress),
    //   "App is not in an OFF state yet"
    // );

    Transfer.Transaction memory txn = appRegistry.getResolution(appCfAddress);

    require(
      Transfer.meetsTerms(txn, terms),
      "Transfer details do not meet terms"
    );

    txn.execute();
  }


}
