pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
import "@counterfactual/contracts/contracts/interfaces/TwoPartyOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";
import "@counterfactual/contracts/contracts/interpreters/ETHInterpreter.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title ETH Unidirectional Payment App
/// @notice This contract allows unidirectional ETH transfers using the
///         takeAction paradigm.
contract EthUnidirectionalPaymentApp is CounterfactualApp {

  using SafeMath for uint256;

  struct AppState {
    ETHInterpreter.ETHTransfer[2] transfers; // [sender, receiver]
    bool finalized;
  }

  struct PaymentAction {
    uint256 paymentAmount;
    bool finalize;
  }

  /// @dev getTurnTaker always returns sender's address to enforce unidirectionality.
  function getTurnTaker(
    bytes calldata encodedState, address[] calldata /* signingKeys */
  )
    external
    pure
    returns (address)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return state.transfers[0].to;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return encodedState;
  }

  function applyAction(
    bytes calldata encodedState, bytes calldata encodedAction
  )
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    PaymentAction memory action = abi.decode(encodedAction, (PaymentAction));

    // apply transition based on action
    AppState memory postState = applyPayment(
      state,
      action.paymentAmount,
      action.finalize
    );

    return abi.encode(postState);
  }

  function applyPayment(
    AppState memory state,
    uint256 paymentAmount,
    bool finalize
  )
    internal
    pure
    returns (AppState memory)
  {
    // subtract payment amount from sender balance
    // SafeMath will throw if below zero
    state.transfers[0].amount = state.transfers[0].amount.sub(paymentAmount);
    // add payment amount to receiver balance
    state.transfers[1].amount = state.transfers[1].amount.add(paymentAmount);
    state.finalized = finalize;

    return state;
  }

  function isStateTerminal(bytes calldata encodedState)
    external
    pure
    returns (bool)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));
    return appState.finalized;
  }

  function outcomeType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.OutcomeType.ETH_TRANSFER);
  }
}
