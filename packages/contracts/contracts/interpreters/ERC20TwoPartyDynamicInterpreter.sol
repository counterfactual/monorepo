pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract ERC20TwoPartyDynamicInterpreter is Interpreter {

  using LibOutcome for LibOutcome.CoinTransfer;

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

    LibOutcome.CoinTransfer[] memory transfers = abi.decode(input, (LibOutcome.CoinTransfer[]));

    Param memory params = abi.decode(encodedParams, (Param));
    uint256 limitRemaining = params.limit;

    for (uint256 i = 0; i < transfers.length; i++) {
      address to = address(uint160(transfers[i].to));
      uint256 amount = transfers[i].amount;

      require(amount <= limitRemaining, "Hit the transfer limit.");
      limitRemaining -= amount;

      ERC20(params.token).transfer(to, amount);
    }
  }
}
