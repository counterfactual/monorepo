pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";

/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract ETHInterpreter is Interpreter {

  struct ETHTransfer {
    address to;
    uint256 amount;
  }

  struct Param {
    uint256 limit;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata params
  )
    external
  {

    ETHTransfer[] memory transfers = abi.decode(input, (ETHTransfer[]));

    uint256 limitRemaining = abi.decode(params, (Param)).limit;

    for (uint256 i = 0; i < transfers.length; i++) {
      address payable to = address(uint160(transfers[i].to));
      uint256 amount = transfers[i].amount;

      require(amount <= limitRemaining, "hit the limit");
      limitRemaining -= amount;

      // note: send() is deliberately used instead of transfer() here
      // so that a revert does not stop the rest of the sends
      to.send(amount);
    }
  }
}
