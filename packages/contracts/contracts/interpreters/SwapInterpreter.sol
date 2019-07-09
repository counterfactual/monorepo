pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract SwapInterpreter is Interpreter {

  using LibOutcome for LibOutcome.CoinBalances;

  struct Param {
    uint256[] limit;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata encodedParams
  )
    external
  {

    LibOutcome.CoinBalances[] memory coinBalances = abi.decode(input, (LibOutcome.CoinBalances[]));
    Param memory params = abi.decode(encodedParams, (Param));

    uint256[] memory limitRemaining = params.limit;

    for (uint256 i = 0; i < coinBalances.length; i++) {
      address payable to = address(uint160(coinBalances[i].to));
      address[] memory coinAddress = coinBalances[i].coinAddress;
      uint256[] memory balance = coinBalances[i].balance;

      for (uint256 j = 0; j < coinBalances[i].balance.length; j++) {
        require(balance[j] <= limitRemaining[j], "Hit the transfer limit.");
        limitRemaining[j] -= balance[j];

        if (coinAddress[j] == address(0x0)) {
          // note: send() is deliberately used instead of transfer() here
          // so that a revert does not stop the rest of the sends
          to.send(balance[j]);
        } else {
          ERC20(coinAddress[j]).transfer(to, balance[j]);
        }
      }
    }
  }
}
