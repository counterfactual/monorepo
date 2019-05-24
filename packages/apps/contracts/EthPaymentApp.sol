pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
import "@counterfactual/contracts/contracts/interfaces/TwoPartyOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";
import "@counterfactual/contracts/contracts/interpreters/ETHInterpreter.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract EthPaymentApp is CounterfactualApp {

  using SafeMath for uint256;

  struct AppState {
    ETHInterpreter.ETHTransfer[2] transfers; // [sender, receiver]
  }

  struct Action {
    uint256 paymentAmount;
  }

  // unidirectional channel, only sender can pay
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

  function resolve(bytes calldata encodedState)
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
    Action memory action = abi.decode(encodedAction, (Action));

    // apply transition based on action
    AppState memory postState = applyPayment(state, action.paymentAmount);

    return abi.encode(postState);
  }

  function applyPayment(
    AppState memory state,
    uint256 paymentAmount
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
    return state;
  }

  function isStateTerminal(bytes calldata encodedState)
    external
    pure
    returns (bool)
  {
    // always terminal
    return true;
  }

  function resolveType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.ResolutionType.TWO_PARTY_OUTCOME);
  }
}
