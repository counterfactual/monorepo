pragma solidity 0.4.25;
pragma experimental "ABIEncoderV2";

import "./libs/Transfer.sol";
import "./libs/LibCondition.sol";

import "./ContractRegistry.sol";
import "./NonceRegistry.sol";


/// @title ConditionalTransaction - A conditional transfer contract
/// @author Liam Horne - <liam@l4v.io>
/// @author Mitchell Van Der Hoeff - <mitchell@l4v.io>
/// @notice Supports a complex transfer of funds contingent on some condition.
contract ConditionalTransaction is LibCondition {

  using Transfer for Transfer.Transaction;

  function executeSimpleConditionalTransaction(
    Condition condition,
    Transfer.Transaction memory txn
  )
    public
  {
    require(
      isSatisfied(condition),
      "Condition was not satisfied for conditional transaction"
    );
    txn.execute();
  }

}
