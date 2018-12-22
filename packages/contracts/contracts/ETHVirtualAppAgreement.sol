pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";
import "./AppRegistry.sol";


/// @title ETHVirtualAppAgreement
/// @notice Commitment target to support "virtual apps", i.e., apps which have
/// ETH committed to them via intemediary lock-up instead of having ETH directly
/// committed in a ledger channel.
/// The `target` contract must return via getResolution the outcome of the app
/// with the same asset type as `agreement.terms`. The value of the resolution
/// to the target's first beneficiary (i.e., `resolution.value[0]`) is
/// treated as the amount assigned to our first beneficiary (i.e.,
/// `agreement.beneficiaries[0]`). Note that `terms.limit` is explicitly
/// ignored since limits are enforced by `capitalProvided`.
contract ETHVirtualAppAgreement {

  using Transfer for Transfer.Transaction;
  using Transfer for Transfer.Terms;

  // todo(ldct): is it possible to make address(registry) a constant specified
  // at link time?
  struct Agreement {
    AppRegistry registry;
    Transfer.Terms terms;
    uint256 expiry;
    bytes32 appInstanceId;
    uint256 capitalProvided;
    address[2] beneficiaries;
  }

  function delegateTarget(Agreement agreement) public {
    require(
      agreement.expiry <= block.number,
      "agreement lockup time has not elapsed"
    );

    Transfer.Transaction memory resolution = agreement.registry
      .getResolution(agreement.appInstanceId);

    require(
      agreement.terms.assetType == resolution.assetType,
      "returned incompatible resolution"
    );

    require(
      agreement.terms.token == resolution.token,
      "returned incompatible resolution"
    );

    require(
      agreement.capitalProvided > resolution.value[0],
      "returned incompatible resolution"
    );

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
