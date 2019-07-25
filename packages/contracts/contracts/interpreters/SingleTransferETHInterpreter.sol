pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../libs/LibOutcome.sol";
import "../interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract SingleTransferETHInterpreter is Interpreter {

  function () external payable { }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutput,
    bytes calldata encodedParams
  )
    external
  {
    LibOutcome.CoinTransfer memory transfer =
      abi.decode(
        encodedOutput,
        (LibOutcome.CoinTransfer)
      );

    address payable to = address(uint160(transfer.to));
    to.transfer(transfer.amount);
  }
}
