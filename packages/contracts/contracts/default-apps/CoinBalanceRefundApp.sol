pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../libs/LibOutcome.sol";


contract CoinBalanceRefundApp {

  struct AppState {
    address recipient;
    address multisig;
    uint256 threshold;
    address token;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    view
    returns (bytes memory)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));

    LibOutcome.CoinTransfer[] memory ret = new LibOutcome.CoinTransfer[](1);

    if (appState.token == address(0x0)) {
      ret[0].amount = address(appState.multisig).balance - appState.threshold;
    } else {
      ret[0].amount = ERC20(appState.token).balanceOf(appState.multisig) -
        appState.threshold;
    }
    ret[0].to = appState.recipient;

    return abi.encode(ret);
  }

}
