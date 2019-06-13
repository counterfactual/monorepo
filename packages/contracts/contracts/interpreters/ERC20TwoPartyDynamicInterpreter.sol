pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract ERC20TwoPartyDynamicInterpreter is Interpreter {

  struct TokenTransfer {
    uint256 amount;
    address to;
  }

  struct Param {
    uint256 limit;
    address token;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata encodedParams
  )
    external
  {

    TokenTransfer[] memory transfer = abi.decode(input, (TokenTransfer[]));

    Param memory params = abi.decode(encodedParams, (Param));
    uint256 limitRemaining = params.limit;

    for (uint256 i = 0; i < transfer.length ; i++) {
      uint256 amount = transfer[i].amount;
      address to = transfer[i].to;

      require(amount <= limitRemaining, "Hit the transfer limit.");
      limitRemaining -= amount;

      ERC20(params.token).transfer(to, amount);
    }
  }
}
