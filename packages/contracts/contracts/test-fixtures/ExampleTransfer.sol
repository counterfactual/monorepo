pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../libs/Transfer.sol";


contract ExampleTransfer {
  using Transfer for Transfer.Transaction;
  function transfer(Transfer.Transaction details) public {
    details.execute();
  }
}
