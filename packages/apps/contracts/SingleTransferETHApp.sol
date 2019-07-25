pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/interfaces/CounterfactualApp.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/// @title SingleTransferETHApp
/// @notice This contract lets one ETH transfer to take place. This is not named
///         `SingleETHTransferApp` to prevent confusion of the amount being sent.
contract SingleTransferETHApp is CounterfactualApp {

  using SafeMath for uint256;

  // Because CoinTransfer does not specify a token address, its default asset
  // type is ETH.
  struct AppState {
    LibOutcome.CoinTransfer coinTransfer;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return encodedState;
  }
}
