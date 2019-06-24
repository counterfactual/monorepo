pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibOutcome.sol";


contract CoinBucket is CounterfactualApp {

  struct AppState {
    LibOutcome.CoinTransfer[] balances;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(abi.decode(encodedState, (AppState)).balances);
  }

}
