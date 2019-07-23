pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";


library CommonOutcomes {

  struct CoinTransfer {
    address to;
    uint256 amount;
  }

  struct CoinTransfersList {
    CoinTransfer[] transfers;
  }

  struct CoinTransferListOfLists {
    CoinTransfer[][] transfers;
  }

  enum TwoPartyFixedOutcome {
    SEND_TO_ADDR_ONE,
    SEND_TO_ADDR_TWO,
    SPLIT_AND_SEND_TO_BOTH_ADDRS
  }

}
