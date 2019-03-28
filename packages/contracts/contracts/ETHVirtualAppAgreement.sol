pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";
import "./AppRegistry.sol";
import "./NonceRegistry.sol";


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

  // todo(xuanji): is it possible to make address(registry) a constant specified
  // at link time?
  struct Agreement {
    AppRegistry registry;
    NonceRegistry nonceRegistry;
    Transfer.Terms terms;
    uint256 expiry;
    bytes32 appIdentityHash;
    uint256 capitalProvided;
    address[2] beneficiaries;
    bytes32 uninstallKey;
  }

  function delegateTarget(Agreement memory agreement) public {
    require(
      agreement.expiry <= block.number,
      "agreement lockup time has not elapsed"
    );

    Transfer.Transaction memory resolution = agreement.registry
      .getResolution(agreement.appIdentityHash);

    require(
      agreement.terms.assetType == resolution.assetType,
      "returned incompatible resolution based on bad asset type"
    );

    require(
      agreement.terms.token == resolution.token,
      "returned incompatible resolution based on bad token value"
    );

    require(
      agreement.capitalProvided > resolution.value[0],
      "returned incompatible resolution"
    );

    require(
      !agreement.nonceRegistry.isFinalizedOrHasNeverBeenSetBefore(agreement.uninstallKey, 1),
      "Virtual app agreement has been uninstalled"
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
