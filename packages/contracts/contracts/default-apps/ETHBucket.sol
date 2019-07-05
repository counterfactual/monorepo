pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibOutcome.sol";


contract ETHBucket is CounterfactualApp {

  struct AppState {
    address[] tokens;
    // The inner array contains the list of CoinTransfers for a single asset type
    // The outer array contains the list of asset balances for respecitve assets
    // according to the indexing used in the `tokens` array above
    LibOutcome.CoinTransfer[][] balances;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(abi.decode(encodedState, (AppState)).balances);
  }

}
