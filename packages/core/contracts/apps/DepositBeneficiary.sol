pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "@counterfactual/core/contracts/StateChannel.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


contract DepositBeneficiary is StateChannel {

  struct State {
    address beneficiary;
    address sink;
    uint256 threshold;
  }

  function resolver(State state, Transfer.Terms terms)
    public
    view
    returns (Transfer.Details ret)
  {
    uint8 assetType = terms.assetType;
    uint256 heldAmount;

    if (assetType == uint8(Transfer.Asset.ETH)) {
      heldAmount = state.sink.balance;
    } else if (assetType == uint8(Transfer.Asset.ERC20)) {
      address token = terms.token;
      heldAmount = ERC20(token).balanceOf(state.sink);
    }

    ret.assetType = terms.assetType;
    ret.token = terms.token;

    ret.to = new address[](1);
    ret.to[0] = state.beneficiary;

    ret.amount = new uint256[](1);
    ret.amount[0] = heldAmount - state.threshold;
  }

}
