pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


contract PaymentApp {

  struct AppState {
    address alice;
    address bob;
    uint256 aliceBalance;
    uint256 bobBalance;
  }

  function resolve(AppState state, Transfer.TransactionLimit terms)
    public
    pure
    returns (Transfer.Transaction)
  {
    return Transfer.make2PTransaction(
      tersm,
      [ state.alice, state.bob ],
      [ state.aliceBalance, state.bobBalance ]
    );
  }

}
