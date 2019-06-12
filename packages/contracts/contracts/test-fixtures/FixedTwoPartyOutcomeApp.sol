pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";
import "../interfaces/TwoPartyFixedOutcome.sol";


contract TwoPartyFixedOutcomeApp {

  function computeOutcome(bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(
      TwoPartyFixedOutcome.Outcome.SPLIT_AND_SEND_TO_BOTH_ADDRS
    );
  }

  function outcomeType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.OutcomeType.TWO_PARTY_FIXED_OUTCOME);
  }

}
