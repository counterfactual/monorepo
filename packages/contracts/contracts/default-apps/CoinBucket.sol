pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibOutcome.sol";


contract CoinBucket is CounterfactualApp {

  struct AppState {
    address[] tokens;
    LibOutcome.CoinTransfer[][] balances;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return abi.encode(state.balances);
  }
}
