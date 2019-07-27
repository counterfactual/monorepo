pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../libs/LibOutcome.sol";


contract CoinBalanceRefundApp {

  using SafeMath for uint256;

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct AppState {
    address payable recipient;
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

    LibOutcome.CoinTransfer memory ret;

    if (appState.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

      ret.amount = address(appState.multisig).balance.sub(appState.threshold);

    } else {

      // solium-disable-next-line operator-whitespace
      ret.amount = ERC20(appState.tokenAddress)
        .balanceOf(appState.multisig).sub(appState.threshold);

    }

    ret.to = appState.recipient;

    return abi.encode(ret);
  }

}
