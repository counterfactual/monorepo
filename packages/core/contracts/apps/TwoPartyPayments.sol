pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/StateChannel.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


contract TwoPartyPayments is StateChannel {

  struct State {
    address alice;
    address bob;
    uint256 aliceBalance;
    uint256 bobBalance;
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
    to[0] = state.alice;
    to[1] = state.bob;

    uint256[] memory amount = new uint256[](2);
    amount[0] = state.aliceBalance;
    amount[1] = state.bobBalance;

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amount
    );
  }

}
