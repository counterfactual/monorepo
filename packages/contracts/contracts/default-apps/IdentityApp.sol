pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";


contract IdentityApp is CounterfactualApp {

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return encodedState;
  }

}
