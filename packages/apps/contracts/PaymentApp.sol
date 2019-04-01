pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/Transfer.sol";
import "@counterfactual/contracts/contracts/CounterfactualApp.sol";


contract PaymentApp {

  struct AppState {
    address alice;
    address bob;
    uint256 aliceBalance;
    uint256 bobBalance;
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    uint256[] memory amounts = new uint256[](2);
    amounts[0] = state.aliceBalance;
    amounts[1] = state.bobBalance;

    address[] memory to = new address[](2);
    to[0] = state.alice;
    to[1] = state.bob;
    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

}
