pragma solidity 0.5.9;
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
    bool finalized;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return abi.encode(state.coinBalances);
  }

  function isStateTerminal(bytes calldata encodedState)
    external
    pure
    returns (bool)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));
    return appState.finalized;
  }

//   function outcomeType()
//     external
//     pure
//     returns (uint256)
//   {
//     return uint256(LibOutcome.CoinTransfer[]);
//   }

}