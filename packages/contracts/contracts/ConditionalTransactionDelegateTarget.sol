pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "./UninstallKeyRegistry.sol";
import "./ChallengeRegistry.sol";


/// @title ConditionalTransactionDelegateTarget
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
contract ConditionalTransactionDelegateTarget {

  function executeEffectOfFreeBalance(
    ChallengeRegistry challengeRegistry,
    bytes32 freeBalanceAppIdentityHash,
    address ethInterpreterAddress
  )
    public
  {
    require(
      challengeRegistry.isStateFinalized(freeBalanceAppIdentityHash),
      "Free Balance app instance is not finalized yet"
    );

    bytes memory outcome = challengeRegistry.getOutcome(
      freeBalanceAppIdentityHash
    );

    uint256 max_uint = 2**256-1;

    bytes memory payload = abi.encodeWithSignature(
      "interpretOutcomeAndExecuteEffect(bytes,bytes)", outcome, abi.encode(max_uint)
    );

    // solium-disable-next-line no-unused-vars
    (bool success, bytes memory returnData) = ethInterpreterAddress
      .delegatecall(payload);

    require(
      success,
      "Execution of executeEffectOfFreeBalance failed"
    );
  }

  /// @notice Execute a fund transfer for a state channel app in a finalized state
  /// @param uninstallKey The key in the uninstall key registry
  /// @param appIdentityHash AppIdentityHash to be resolved
  function executeEffectOfInterpretedAppOutcome(
    ChallengeRegistry challengeRegistry,
    UninstallKeyRegistry uninstallKeyRegistry,
    bytes32 uninstallKey,
    bytes32 appIdentityHash,
    address interpreterAddress,
    bytes memory interpreterParams
  )
    public
  {
    require(
      !uninstallKeyRegistry.uninstalledKeys(uninstallKey),
      "App has been uninstalled"
    );

    require(
      challengeRegistry.isStateFinalized(appIdentityHash),
      "App is not finalized yet"
    );

    bytes memory outcome = challengeRegistry.getOutcome(
      appIdentityHash
    );

    bytes memory payload = abi.encodeWithSignature(
      "interpretOutcomeAndExecuteEffect(bytes,bytes)", outcome, interpreterParams
    );

    // solium-disable-next-line no-unused-vars
    (bool success, bytes memory returnData) = interpreterAddress
      .delegatecall(payload);

    require(
      success,
      "Execution of executeEffectOfInterpretedAppOutcome failed"
    );
  }


}
