pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Transfer.sol";
import "@counterfactual/core/contracts/NonceRegistry.sol";
import "@counterfactual/core/contracts/Registry.sol";
import "@counterfactual/core/contracts/StateChannel.sol";


contract VirtualAppAgreement {

  using Transfer for Transfer.Details;
  using Transfer for Transfer.Terms;

  struct Agreement {
    Registry registry;
    NonceRegistry nonceRegistry;
    Transfer.Terms terms;
    uint256 capitalProvided;
    uint256 loanDuration;
    bytes32 virtualStateDeposit;
    address intermediary;
  }

  function delegateTarget(
    bytes32 salt,
    uint256 nonce,
    Agreement agreement
  )
    public
  {

    require(agreement.nonceRegistry.isFinalizedAt(salt, nonce));

    address[] memory to = new address[](2);
    to[0] = agreement.registry.resolver(agreement.virtualStateDeposit);
    to[1] = agreement.intermediary;

    uint256[] memory amount = new uint256[](2);
    amount[0] = agreement.capitalProvided;
    amount[1] = agreement.capitalProvided;
    bytes memory data;

    Transfer.Details memory ret = Transfer.Details(
      agreement.terms.assetType,
      agreement.terms.token,
      to,
      amount,
      data
    );

    ret.executeTransfer();

  }

}
