pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibOutcome.sol";


contract ETHBucket is CounterfactualApp {

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
