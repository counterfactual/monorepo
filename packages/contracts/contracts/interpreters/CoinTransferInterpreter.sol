pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../libs/LibOutcome.sol";
import "../interfaces/Interpreter.sol";


/**
 * This file is excluded from ethlint/solium because of this issue:
 * https://github.com/duaraghav8/Ethlint/issues/261
 */
contract CoinTransferInterpreter is Interpreter {

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct Param {
    uint256[] limit;
    address[] tokenAddresses;
  }

  function () external payable { }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutput,
    bytes calldata encodedParams
  )
    external
  {

    Param memory params = abi.decode(encodedParams, (Param));

    LibOutcome.CoinTransfer[][] memory assetTransfers =
      abi.decode(
        encodedOutput,
        (LibOutcome.CoinTransfer[][])
      );

    for (uint256 i = 0; i < assetTransfers.length; i++) {
      address tokenAddress = params.tokenAddresses[i];
      uint256 limitRemaining = params.limit[i];
      LibOutcome.CoinTransfer[] memory transfers = assetTransfers[i];

      for (uint256 transferIndex = 0; transferIndex < transfers.length; transferIndex++) {
        LibOutcome.CoinTransfer memory transfer = transfers[transferIndex];

        address payable to = address(uint160(transfer.to));

        if (transfer.amount == 0) {
          continue;
        }

        require(transfer.amount <= limitRemaining, "Hit the transfer limit.");

        limitRemaining -= transfer.amount;

        if (tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
          // note: send() is deliberately used instead of transfer() here
          // so that a revert does not stop the rest of the sends
          to.send(transfer.amount);
        } else {
          ERC20(tokenAddress).transfer(to, transfer.amount);
        }
      }
    }
  }
}
