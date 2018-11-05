pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";
import "../NonceRegistry.sol";
import "../Registry.sol";


contract VirtualAppAgreement {

  using Transfer for Transfer.Transaction;
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

    require(
      agreement.nonceRegistry.isFinalized(salt, nonce),
      "VirtualAapp nonceRegistry was not finalized"
    );

    address[] memory to = new address[](2);
    to[0] = agreement.registry.resolver(agreement.virtualStateDeposit);
    to[1] = agreement.intermediary;

    uint256[] memory amount = new uint256[](2);
    amount[0] = agreement.capitalProvided;
    amount[1] = agreement.capitalProvided;
    bytes[] memory data = new bytes[](2);

    Transfer.Transaction memory ret = Transfer.Transaction(
      agreement.terms.assetType,
      agreement.terms.token,
      to,
      amount,
      data
    );

    ret.execute();

  }

}
