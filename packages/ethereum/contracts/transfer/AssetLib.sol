pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";


library AssetLib {

  using RegistryAddressLib for RegistryAddressLib.CFAddress;

  struct ETHTransfer {
    RegistryAddressLib.CFAddress to;
    uint256 amount;
  }

  struct ERC20Transfer {
    address token;
    RegistryAddressLib.CFAddress to;
    uint256 amount;
  }

}
