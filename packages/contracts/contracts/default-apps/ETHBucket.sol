pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibOutcome.sol";


contract ETHBucket is CounterfactualApp {

  using LibOutcome for LibOutcome.CoinTransfer;

  struct AppState {
    LibOutcome.CoinTransfer[] transfers;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(abi.decode(encodedState, (AppState)).transfers);
  }

}
