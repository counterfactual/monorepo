pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "./NonceRegistry.sol";
import "./AppRegistry.sol";


/// @title StateChannelTransaction
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract StateChannelTransaction {

  /// @notice Execute a fund transfer for a state channel app in a finalized state
  /// @param uninstallKey The key in the nonce registry
  /// @param appIdentityHash AppIdentityHash to be resolved
  function executeAppConditionalTransaction(
    AppRegistry appRegistry,
    NonceRegistry nonceRegistry,
    bytes32 uninstallKey,
    uint256 rootNonceExpectedValue,
    bytes32 appIdentityHash,
    address interpreterAddress,
    bytes memory interpreterParams
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

    bytes memory outcome = appRegistry.getOutcome(
      appIdentityHash
    );

    bytes memory payload = abi.encodeWithSignature(
      "interpretOutcomeAndExecuteEffect(bytes,bytes)", outcome, interpreterParams
    );

    // solium-disable-next-line no-unused-vars
    (bool success, bytes memory returnData) = interpreterAddress
      .delegatecall(payload);

    require(success, "Execution of executeAppConditionalTransaction failed");
  }


}
