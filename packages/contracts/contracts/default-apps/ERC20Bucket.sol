pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../interfaces/Interpreter.sol";
import "../interpreters/ERC20TwoPartyDynamicInterpreter.sol";


contract ERC20Bucket is CounterfactualApp {

  struct AppState {
    ERC20TwoPartyDynamicInterpreter.TokenTransfer[] transfers;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(abi.decode(encodedState, (AppState)).transfers);
  }

  function outcomeType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.OutcomeType.ERC20_TRANSFER);
  }

}
