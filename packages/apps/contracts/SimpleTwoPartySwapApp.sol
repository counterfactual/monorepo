pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";
import "@counterfactual/contracts/contracts/interpreters/SwapInterpreter.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/// @title Simple Swap App
/// @notice This contract lets two parties swap one ERC20 or ETH asset for another

contract SimpleTwoPartySwapApp is CounterfactualApp {

  using SafeMath for uint256;

  struct AppState {
    LibOutcome.CoinBalances[] coinBalances; // [Alice, Bob]
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    uint256[] memory balancesA = state.coinBalances[0].balance;
    uint256[] memory balancesB = state.coinBalances[1].balance;

    // apply swap
    state.coinBalances[0].balance = balancesB;
    state.coinBalances[1].balance = balancesA;

    return abi.encode(state.coinBalances);
  }
}
