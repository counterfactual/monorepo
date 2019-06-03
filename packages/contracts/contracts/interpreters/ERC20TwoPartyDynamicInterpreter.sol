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
    uint256[2] amounts;
  }

  struct Param {
    address[2] to;
    uint256 limit;
    address tokenAddress;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata encodedParams
  )
    external
  {

    TokenTransfer memory transfer = abi.decode(input, (TokenTransfer));

    Param memory params = abi.decode(encodedParams, (Param));
    uint256 limitRemaining = params.limit;


    require(
      transfer.amounts.length == params.to.length,
      "Mismatch between number of transfer amounts and receiving addresses"
    );

    for (uint256 i = 0; i < transfer.amounts.length ; i++) {
      uint256 amount = transfer.amounts[i];
      address to = params.to[i];

      require(amount <= limitRemaining, "hit the limit");
      limitRemaining -= amount;

      ERC20(params.tokenAddress).transfer(to, amount);
    }
  }
}
