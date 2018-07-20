pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/StateChannel.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


contract UnidirectionalPayments is StateChannel {

  struct State {
    address sender;
    address recipient;
    uint256 totalAmount;
    uint256 amountSent;
  }

  constructor(address[] signingKeys, bytes32 commithash)
    StateChannel(signingKeys, commithash)
    public {}

  function resolver(State state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    address[] memory to = new address[](2);
    to[0] = state.sender;
    to[1] = state.recipient;

    uint256[] memory amount = new uint256[](2);
    amount[0] = state.totalAmount - state.amountSent;
    amount[1] = state.amountSent;

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amount
    );
  }

}
