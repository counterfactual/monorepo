pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "./ChallengeRegistry.sol";
import "./UninstallKeyRegistry.sol";


/// @title TwoPartyVirtualEthAsLump
/// @notice Commitment target to support "virtual apps", i.e., apps which have
/// ETH committed to them via intermediary lock-up instead of having ETH directly
/// committed in a direct channel.
/// The `target` contract must return via outcome the outcome of the app,
/// and the computeOutcome function must be TwoPartyFixedOutcome type.
/// We do not use the interpreter mechanism in StateChannelTransaction.sol
/// because the delegateTarget function must be committed to in at least two
/// places (in general, the same number of places as the channel length) with
/// different parameters.
contract TwoPartyVirtualEthAsLump {

  // todo(xuanji): is it possible to make address(registry) a constant specified
  // at link time?
  struct Agreement {
    ChallengeRegistry registry;
    UninstallKeyRegistry uninstallKeyRegistry;
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

    bytes memory outcome = agreement.registry
      .getOutcome(agreement.appIdentityHash);

    uint256 outcomeAsUint256 = abi.decode(outcome, (uint256));

    require(
      !agreement.uninstallKeyRegistry.uninstalledKeys(agreement.uninstallKey),
      "Virtual app agreement has been uninstalled"
    );

    if (outcomeAsUint256 <= 1) {
      // TODO: @xuanji document why we use send here
      // solium-disable-next-line security/no-send
      agreement.beneficiaries[outcomeAsUint256].send(agreement.capitalProvided);
      return;
    }

    /* SPLIT_AND_SEND_TO_BOTH_ADDRS or default cases */

    agreement.beneficiaries[0].transfer(agreement.capitalProvided / 2);
    agreement.beneficiaries[1].transfer(
      agreement.capitalProvided - agreement.capitalProvided / 2);

    return;
  }

}
