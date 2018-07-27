pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/AddressUtils.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/// @title Transfer - A library to encode a generic asset transfer data type
/// @author Liam Horne - <liam@l4v.io>
/// @notice This library defines `Transfer.Details` and `Transfer.Terms`, two structures
/// which are used in state channel applications to represent a kind of "resolution" and
/// a commitment to how much can be resolved respectively. A `Transfer.Details` object
/// should be able to encode any arbitrary Ethereum-based asset transfer.
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

  /// @notice A delegate target for executing transfers of an arbitrary Transfer.Detail
  /// @param details A `Transfer.Details` struct
  /// TODO: Add support for an OTHER Asset type and do a (to, value, data) CALL
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

  /// @notice Verifies whether or not a `Transfer.Details` meets the terms set by a
  /// `Transfer.Terms` object based on the limit information of how much can be transferred
  /// @param details A `Transfer.Details` struct
  /// @param details A `Transfer.Terms` struct
  /// @return A boolean indicating if the terms are met
  function meetsTerms(
    Transfer.Details memory details,
    Transfer.Terms terms
  )
    public
    pure
    returns (bool)
  {
    uint256 sum = 0;
    for (uint256 i = 0; i < details.amount.length; i++) {
      sum += details.amount[i];
    }
    return sum == terms.limit;
  }

}
