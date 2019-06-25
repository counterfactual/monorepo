pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "./UninstallKeyRegistry.sol";
import "./ChallengeRegistry.sol";


/// @title ConditionalTransactionDelegateTarget
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract ConditionalTransactionDelegateTarget {

  function withdrawFromUserBalances(
    ChallengeRegistry appRegistry,
    bytes32 ledgerChannelIdentityHash
  )
    public
  {
    require(
      appRegistry.isStateFinalized(ledgerChannelIdentityHash),
      "Ledger Channel is not finalized yet"
    );

    bytes memory outcome = appRegistry.getOutcome(
      ledgerChannelIdentityHash
    );

    LedgerChannel.AppState appState = abi.decode(outcome);

    (address, address, uint256)[] personalBalances = appState.personalBalances;

    // execute personalBalances
  }

  function executeEffectOfInterpretedAppOutcome(
    ChallengeRegistry appRegistry,
    bytes32 ledgerChannelIdentityHash,
    bytes32 appIdentityHash,
    address interpreterAddress,
    bytes memory interpreterParams
  )
    public
  {

    // require that ledgerChannelIdentityHash outcome contains this thing

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

    require(
      success,
      "Execution of executeEffectOfInterpretedAppOutcome failed"
    );
  }



}
