pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";


/// @title ETH Unidirectional Transfer App
/// @notice This contract allows unidirectional ETH transfers using the
///         takeAction paradigm.
contract ETHUnidirectionalTransferApp is CounterfactualApp {

  using SafeMath for uint256;

  struct AppState {
    LibOutcome.CoinTransfer[] transfers; // [sender, receiver]
    bool finalized;
  }

  struct TransferAction {
    uint256 transferAmount;
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
    AppState memory state = abi.decode(encodedState, (AppState));
    return abi.encode(state.transfers);
  }

  function applyAction(
    bytes calldata encodedState, bytes calldata encodedAction
  )
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    TransferAction memory action = abi.decode(encodedAction, (TransferAction));

    // apply transition based on action
    AppState memory postState = applyTransfer(
      state,
      action.transferAmount,
      action.finalize
    );

    return abi.encode(postState);
  }

  function isStateTerminal(bytes calldata encodedState)
    external
    pure
    returns (bool)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));
    return appState.finalized;
  }

  function applyTransfer(
    AppState memory state,
    uint256 transferAmount,
    bool finalize
  )
    internal
    pure
    returns (AppState memory)
  {
    // subtract transfer amount from sender balance
    // SafeMath will throw if below zero
    state.transfers[0].amount = state.transfers[0].amount.sub(transferAmount);
    // add transfer amount to receiver balance
    state.transfers[1].amount = state.transfers[1].amount.add(transferAmount);
    state.finalized = finalize;

    return state;
  }

}
