pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract ERC20Interpreter is Interpreter {

  struct TokenTransfer {
    uint256[] amounts;
  }

  struct Param {
    address[] to;
    uint256 limit;
    address tokenAddress;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata encodedParams
  )
    external
  {

    TokenTransfer memory transfers = abi.decode(input, (TokenTransfer));

    Param memory params = abi.decode(encodedParams, (Param));
    uint256 limitRemaining = params.limit;


    require(transfers.amounts.length == params.to.length,
      "Mismatch between transfer amounts and receiving addresses");

    for (uint256 i = 0; i < transfers.amounts.length ; i++) {
      uint256 amount = transfers.amounts[i];
      address to = params.to[i];

      require(amount <= limitRemaining, "hit the limit");
      limitRemaining -= amount;

      ERC20(params.tokenAddress).transfer(to, amount);
    }
  }
}
