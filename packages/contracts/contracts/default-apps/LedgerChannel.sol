pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";


contract LedgerChannel {

  struct AppState {
    (address, address, uint256)[] personalBalances;
    (bytes32, address, uint256)[] appBalances;
  }

}
