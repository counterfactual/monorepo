pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "./AppRegistry.sol";
import "./NonceRegistry.sol";


contract UintAsEthVirtualApp {

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

    uint256 resolutionAsValue = abi.decode(resolution, (uint256));

    require(
      !agreement.nonceRegistry.isFinalizedOrHasNeverBeenSetBefore(
        agreement.uninstallKey, 1),
      "Virtual app agreement has been uninstalled"
    );

    uint256[] memory amount = new uint256[](2);

    if (resolutionAsValue > agreement.capitalProvided) {
      resolutionAsValue = agreement.capitalProvided;
    }

    amount[0] = resolutionAsValue;
    amount[1] = agreement.capitalProvided - resolutionAsValue;

    agreement.beneficiaries[0].send(amount[0]);
    agreement.beneficiaries[1].send(amount[1]);
  }

}
