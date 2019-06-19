pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "../libs/LibOutcome.sol";


contract ETHBalanceRefundApp {

  struct AppState {
    address recipient;
    address multisig;
    uint256 threshold;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    view
    returns (bytes memory)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));

    LibOutcome.CoinTransfer[] memory ret = new LibOutcome.CoinTransfer[](1);

    ret[0].amount = address(appState.multisig).balance - appState.threshold;
    ret[0].to = appState.recipient;

    return abi.encode(ret);
  }

}
