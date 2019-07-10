pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";


library LibOutcome {

  struct CoinTransfer {
    address to;
    uint256 amount;
  }

  struct CoinBalances {
    address to;
    address[] coinAddress;
    uint256[] balance;
  }


  enum TwoPartyFixedOutcome {
    SEND_TO_ADDR_ONE,
    SEND_TO_ADDR_TWO,
    SPLIT_AND_SEND_TO_BOTH_ADDRS
  }

}
