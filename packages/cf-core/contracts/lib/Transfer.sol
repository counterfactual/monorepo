pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/AddressUtils.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


library Transfer {

  enum Asset {
    ETH,
    ERC20
  }

  struct Terms {
    uint8 assetType;
    uint256 limit;
    address token;
  }

  struct Details {
    uint8 assetType;
    address token;
    address[] to;
    uint256[] amount;
    bytes data;
  }

  function executeTransfer(Transfer.Details memory details) public {
    for (uint256 i = 0; i < details.to.length; i++) {
      address to = details.to[i];
      uint256 amount = details.amount[i];

      if (details.assetType == uint8(Transfer.Asset.ETH)) {
        to.transfer(amount);
      } else if (details.assetType == uint8(Transfer.Asset.ERC20)) {
        require(ERC20(details.token).transfer(to, amount));
      }
    }
  }

  function meetsTerms(
    Transfer.Details memory details,
    Transfer.Terms terms
  )
    public
    pure
    returns (bool)
  {
    if (details.assetType != terms.assetType || details.token != terms.token) {
      return false;
    }
    uint256 sum = 0;
    for (uint256 i = 0; i < details.amount.length; i++) {
      sum += details.amount[i];
    }
    return sum == terms.limit;
  }

}
