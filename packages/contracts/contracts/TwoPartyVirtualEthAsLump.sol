pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "./AppRegistry.sol";
import "./NonceRegistry.sol";


/// @title TwoPartyVirtualEthAsLump
/// @notice Commitment target to support "virtual apps", i.e., apps which have
/// ETH committed to them via intermediary lock-up instead of having ETH directly
/// committed in a ledger channel.
/// The `target` contract must return via resolution the outcome of the app,
/// and the resolve function must be TwoPartyOutcome type.
/// We do not use the interpreter mechanism in StateChannelTransaction.sol
/// because the delegateTarget function must be committed to in at least two
/// places (in general, the same number of places as the channel length) with
/// different parameters.
contract TwoPartyVirtualEthAsLump {

  // todo(xuanji): is it possible to make address(registry) a constant specified
  // at link time?
  struct Agreement {
    AppRegistry registry;
    NonceRegistry nonceRegistry;
    uint256 expiry;
    bytes32 appIdentityHash;
    uint256 capitalProvided;
    address payable[2] beneficiaries;
    bytes32 uninstallKey;
  }

  function delegateTarget(Agreement memory agreement) public {
    require(
      agreement.expiry <= block.number,
      "agreement lockup time has not elapsed"
    );

    bytes memory resolution = agreement.registry
      .getResolution(agreement.appIdentityHash);

    uint256 resolutionAsUint = abi.decode(resolution, (uint256));

    require(
      !agreement.nonceRegistry.isFinalizedOrHasNeverBeenSetBefore(agreement.uninstallKey, 1),
      "Virtual app agreement has been uninstalled"
    );

    if (resolutionAsUint <= 1) {
      agreement.beneficiaries[resolutionAsUint].send(agreement.capitalProvided);
      return;
    }

    /* SPLIT_AND_SEND_TO_BOTH_ADDRS or default cases */

    agreement.beneficiaries[0].transfer(agreement.capitalProvided / 2);
    agreement.beneficiaries[1].transfer(
      agreement.capitalProvided - agreement.capitalProvided / 2);

    return;
  }

}
