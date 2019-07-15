pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";
import "@counterfactual/contracts/contracts/interpreters/SwapInterpreter.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/// @title SimpleTwoPartySwapApp
/// @notice This contract lets two parties swap one ERC20 or ETH asset for another
contract SimpleTwoPartySwapApp is CounterfactualApp {

  using SafeMath for uint256;

  struct AppState {
    LibOutcome.MultiCoinTransfer[] multiCoinTransfers;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    uint256[] memory amountsA = state.multiCoinTransfers[0].amounts;
    uint256[] memory amountsB = state.multiCoinTransfers[1].amounts;

    state.multiCoinTransfers[0].amounts = amountsB;
    state.multiCoinTransfers[1].amounts = amountsA;

    return abi.encode(state.multiCoinTransfers);
  }
}
