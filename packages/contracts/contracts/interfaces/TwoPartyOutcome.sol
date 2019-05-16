pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";


contract TwoPartyOutcome {

  enum Resolution {
    SEND_TO_ADDR_ONE,
    SEND_TO_ADDR_TWO,
    SPLIT_AND_SEND_TO_BOTH_ADDRS
  }

}