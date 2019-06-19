pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";


library LibOutcome {

  struct CoinTransfer {
    address to;
    uint256 amount;
  }

  enum TwoPartyFixedOutcome {
    SEND_TO_ADDR_ONE,
    SEND_TO_ADDR_TWO,
    SPLIT_AND_SEND_TO_BOTH_ADDRS
  }

}
