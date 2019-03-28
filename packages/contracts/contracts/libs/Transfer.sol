pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/// @title Transfer - A library to encode a generic asset transfer data type
/// @author Liam Horne - <liam@l4v.io>
/// @notice This library defines `Transfer.Transaction` and `Transfer.Terms`, two structures
/// which are used in state channel applications to represent a kind of "resolution" and
/// a commitment to how much can be resolved respectively. A `Transfer.Transaction` object
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

  struct Transaction {
    uint8 assetType;
    address token;
    address[] to;
    uint256[] value;
    bytes[] data;
  }

  /// @notice A delegate target for executing transfers of an arbitrary Transfer.Detail
  /// @param txn A `Transfer.Transaction` struct
  /// TODO: Add support for an OTHER Asset type and do a (to, value, data) CALL
  function execute(Transfer.Transaction memory txn) public {
    for (uint256 i = 0; i < txn.to.length; i++) {
      address payable to = address(uint160(txn.to[i]));
      uint256 value = txn.value[i];

      if (txn.assetType == uint8(Transfer.Asset.ETH)) {
        // solidity.readthedocs.io/en/v0.5.7/050-breaking-changes.html
        address payable receiver = address(uint160(to));
        receiver.transfer(value);
      } else if (txn.assetType == uint8(Transfer.Asset.ERC20)) {
        require(
          ERC20(txn.token).transfer(to, value),
          "Execution of ERC20 Transaction failed."
        );
      }
    }
  }

  /// @notice Verifies whether or not a `Transfer.Transaction` meets the terms set by a
  /// `Transfer.Terms` object based on the limit information of how much can be transferred
  /// @param txn A `Transfer.Transaction` struct
  /// @return A boolean indicating if the terms are met
  function meetsTerms(
    Transfer.Transaction memory txn,
    Transfer.Terms memory terms
  )
    public
    pure
    returns (bool)
  {
    uint256 sum = 0;
    for (uint256 i = 0; i < txn.value.length; i++) {
      sum += txn.value[i];
    }
    return sum <= terms.limit;
  }

}
