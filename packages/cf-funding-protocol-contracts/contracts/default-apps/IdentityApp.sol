pragma solidity 0.5.12;
pragma experimental "ABIEncoderV2";

/* solium-disable-next-line */
import "@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol";


contract IdentityApp is CounterfactualApp {

  function computeOutcome(bytes memory encodedState)
    public
    pure
    returns (bytes memory)
  {
    return encodedState;
  }

}
