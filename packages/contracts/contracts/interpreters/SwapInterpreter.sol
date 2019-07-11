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

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct Param {
    uint256[] limit;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutputFromApp,
    bytes calldata encodedParams
  )
    external
  {
    LibOutcome.MultiCoinTransfer[] memory multiCoinTransfers = abi.decode(
      encodedOutputFromApp,
      (LibOutcome.MultiCoinTransfer[])
    );

    Param memory params = abi.decode(encodedParams, (Param));

    uint256[] memory limitRemaining = params.limit;

    for (uint256 i = 0; i < multiCoinTransfers.length; i++) {
      address payable to = address(uint160(multiCoinTransfers[i].to));
      address[] memory tokenAddresses = multiCoinTransfers[i].tokenAddresses;
      uint256[] memory amounts = multiCoinTransfers[i].amounts;

      for (uint256 j = 0; j < multiCoinTransfers[i].amounts.length; j++) {
        require(amounts[j] <= limitRemaining[j], "Hit the transfer limit.");
        limitRemaining[j] -= amounts[j];

        if (tokenAddresses[j] == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
          // note: send() is deliberately used instead of transfer() here
          // so that a revert does not stop the rest of the sends
          to.send(amounts[j]);
        } else {
          ERC20(tokenAddresses[j]).transfer(to, amounts[j]);
        }
      }
    }
  }
}
