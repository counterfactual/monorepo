pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interpreters/ETHInterpreter.sol";


contract ETHBalanceRefundApp {

  struct AppState {
    address recipient;
    address multisig;
    uint256 threshold;
  }

  function resolve(bytes calldata encodedState)
    external
    view
    returns (bytes memory)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));

    ETHInterpreter.ETHTransfer[] memory ret =
      new ETHInterpreter.ETHTransfer[](1);
    ret[0].amount = address(appState.multisig).balance - appState.threshold;
    ret[0].to = appState.recipient;

    return abi.encode(ret);
  }

  function resolveType()
    external
    pure
    returns (uint256)
  {
    return 1;
  }


}
