pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";
import "../Registry.sol";
import "../AppInstance.sol";


contract VirtualAppAgreement {

  using Transfer for Transfer.Transaction;
  using Transfer for Transfer.Terms;

  struct Agreement {
    Registry registry;
    Transfer.Terms terms;
    uint256 expiry;
    bytes32 target;
    address intermediary;
    uint256 capitalProvided;
    address[2] beneficiaries;
  }

  function delegateTarget(
    Agreement agreement
  )
    public
  {
    require(agreement.expiry <= block.number, "agreement has not expired yet");
    address target = agreement.registry.resolver(agreement.target);
    Transfer.Transaction memory resolution = AppInstance(target).getResolution();

    require(resolution.value.length == 1, "returned invalid resolution");
    require(resolution.to.length == 1, "returned invalid resolution");
    require(agreement.terms.assetType == resolution.assetType, "returned incompatible resolution");
    require(agreement.terms.token == resolution.token, "returned incompatible resolution");

    uint256[] memory amount = new uint256[](2);
    amount[0] = resolution.value[0];
    amount[1] = agreement.capitalProvided - amount[0];
    bytes[] memory data = new bytes[](2);

    address[] memory beneficiaries = new address[](2);
    beneficiaries[0] = agreement.beneficiaries[0];
    beneficiaries[1] = agreement.beneficiaries[1];

    Transfer.Transaction memory ret = Transfer.Transaction(
      agreement.terms.assetType,
      agreement.terms.token,
      beneficiaries,
      amount,
      data
    );

    ret.execute();
  }

}
