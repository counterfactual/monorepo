pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "@counterfactual/contracts/contracts/libs/LibOutcome.sol";
import "@counterfactual/contracts/contracts/interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract CoinTransferInterpreter is Interpreter {

  using LibOutcome for LibOutcome.CoinTransfer;

  struct Param {
    uint256[] limit;
    address[] tokens;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata encodedParams
  )
    external
  {

    Param memory params = abi.decode(encodedParams, (Param));
    uint256[] memory limitsRemaining = params.limit;
    address[] memory tokens = params.tokens;

    LibOutcome.CoinTransfer[][] memory assetTransfers =
      abi.decode(input, (LibOutcome.CoinTransfer[][]));

    for (uint256 tokenIndex = 0; tokenIndex < assetTransfers.length; tokenIndex++) {
      address token = tokens[tokenIndex];
      uint256 limitRemaining = limitsRemaining[tokenIndex];
      LibOutcome.CoinTransfer[] memory transfers = assetTransfers[tokenIndex];

      for (uint256 transferIndex = 0; transferIndex < transfers.length; transferIndex++) {
        LibOutcome.CoinTransfer memory transfer = transfers[transferIndex];
        address payable to = address(uint160(transfer.to));
        uint256 amount = transfer.amount;

        require(amount <= limitRemaining, "Hit the transfer limit.");
        limitRemaining -= amount;

        if (token == address(0x0)) {
          // note: send() is deliberately used instead of transfer() here
          // so that a revert does not stop the rest of the sends
          to.send(amount);
        } else {
          ERC20(token).transfer(to, amount);
        }
      }
    }
  }
}
