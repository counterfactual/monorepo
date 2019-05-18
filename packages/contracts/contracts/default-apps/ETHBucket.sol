pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../interfaces/Interpreter.sol";
import "../interpreters/ETHInterpreter.sol";


contract ETHBucket is CounterfactualApp {

  struct AppState {
    ETHInterpreter.ETHTransfer[] transfers;
  }

  function resolve(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return encodedState;
  }

  function resolveType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.ResolutionType.ETH_TRANSFER);
  }

}
