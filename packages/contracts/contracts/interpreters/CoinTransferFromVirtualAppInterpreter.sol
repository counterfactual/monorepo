pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../interfaces/Interpreter.sol";
import "../libs/LibOutcome.sol";


/// @notice
///
/// Interprets a finalized AppInstance whose outcome is of type
/// CoinTransfer. While CoinTransfer outcome contains `to` and `coinAddress`
/// fields, those fields are *ignored* by this interpreter. Only the `amount`
/// field is used.

contract CoinTransferFromVirtualAppInterpreter is Interpreter {

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct Agreement {
    uint256 capitalProvided;
    uint256 expiryBlock;
    address payable[2] beneficiaries;
    address tokenAddress;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutcome,
    bytes calldata params
  )
    external
  {
    LibOutcome.CoinTransfer memory outcome = abi.decode(
      encodedOutcome,
      (LibOutcome.CoinTransfer)
    );

    Agreement memory agreement = abi.decode(
      params,
      (Agreement)
    );

    require(
      block.number < agreement.expiryBlock,
      "Virtual App agreement has expired and is no longer valid."
    );

    if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

      agreement.beneficiaries[0].transfer(
        outcome.amount
      );

      agreement.beneficiaries[1].transfer(
        agreement.capitalProvided - outcome.amount
      );

    } else {

      ERC20(agreement.tokenAddress).transfer(
        agreement.beneficiaries[0],
        outcome.amount
      );

      ERC20(agreement.tokenAddress).transfer(
        agreement.beneficiaries[1],
        agreement.capitalProvided - outcome.amount
      );
    }
  }

}
