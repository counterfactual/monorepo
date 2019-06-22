pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract ERC20BalanceRefundApp {

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

    // solium-disable-next-line max-len
    ret[0].amount = ERC20(appState.token).balanceOf(appState.multisig) - appState.threshold;
    ret[0].to = appState.recipient;

    return abi.encode(ret);
  }
}
