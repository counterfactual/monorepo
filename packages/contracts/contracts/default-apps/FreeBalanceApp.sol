pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibOutcome.sol";


contract FreeBalanceApp is CounterfactualApp {

  struct FreeBalanceAppState {
    address[] tokenAddresses;
    // The inner array contains the list of CoinTransfers for a single asset type
    // The outer array contains the list of asset balances for respecitve assets
    // according to the indexing used in the `tokens` array above
    LibOutcome.CoinTransfer[][] balances;
    bytes32[] activeApps;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return encodedState;
  }

}
