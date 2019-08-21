pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "../libs/LibOutcome.sol";


contract TwoPartyFixedOutcomeApp {

  function computeOutcome(bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(
      LibOutcome.TwoPartyFixedOutcome.SPLIT_AND_SEND_TO_BOTH_ADDRS
    );
  }

}
