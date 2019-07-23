pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../libs/LibOutcome.sol";


contract CoinBalanceRefundApp {

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct AppState {
    address recipient;
    address multisig;
    uint256 threshold;
    address tokenAddress;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    view
    returns (bytes memory)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));

    LibOutcome.CoinTransfer[1][1] memory ret;

    if (appState.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

      ret[0][0].amount = address(appState.multisig).balance - appState.threshold;

    } else {

      // solium-disable-next-line operator-whitespace
      ret[0][0].amount = ERC20(appState.tokenAddress)
        .balanceOf(appState.multisig) - appState.threshold;

    }

    ret[0][0].to = appState.recipient;

    return abi.encode(ret);
  }

}
