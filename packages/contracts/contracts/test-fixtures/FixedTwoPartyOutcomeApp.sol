pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";
import "../libs/CommonOutcomes.sol";


contract TwoPartyFixedOutcomeApp {

  function computeOutcome(bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(
      CommonOutcomes.TwoPartyFixedOutcome.SPLIT_AND_SEND_TO_BOTH_ADDRS
    );
  }

}
