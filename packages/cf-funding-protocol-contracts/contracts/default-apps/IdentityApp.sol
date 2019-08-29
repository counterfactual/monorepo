pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

/* solium-disable-next-line */
import "@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol";


contract IdentityApp is CounterfactualApp {

  function computeOutcome(bytes calldata encodedState)
    external
    pure
    returns (bytes memory)
  {
    return encodedState;
  }

}
