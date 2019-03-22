pragma solidity 0.5.6;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";


contract ExampleTransfer {
  using Transfer for Transfer.Transaction;
  function transfer(Transfer.Transaction memory details) public {
    details.execute();
  }
}
