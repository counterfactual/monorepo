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
///
/// TODO: Use the `capitalProvided` field to ensure sum of amounts ==
///       capitalProvided.
contract SingleAssetTwoPartyCoinTransferFromVirtualAppInterpreter
  is Interpreter
{

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct VirtualAppIntermediaryAgreement {
    uint256 capitalProvided;
    uint256 expiryBlock;
    address payable capitalProvider;
    address payable virtualAppUser;
    address tokenAddress;
  }

  function () external payable { }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutcome,
    bytes calldata encodedParams
  )
    external
  {
    LibOutcome.CoinTransfer[2] memory outcome = abi.decode(
      encodedOutcome,
      (LibOutcome.CoinTransfer[2])
    );

    VirtualAppIntermediaryAgreement memory agreement = abi.decode(
      encodedParams,
      (VirtualAppIntermediaryAgreement)
    );

    require(
      block.number < agreement.expiryBlock,
      "Virtual App agreement has expired and is no longer valid."
    );

    if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

      if (outcome[0].to == agreement.virtualAppUser) {
        outcome[0].to.transfer(outcome[0].amount);
        agreement.capitalProvider.transfer(
          agreement.capitalProvided - outcome[0].amount
        );
      } else if (outcome[1].to == agreement.virtualAppUser) {
        outcome[1].to.transfer(outcome[1].amount);
        agreement.capitalProvider.transfer(
          agreement.capitalProvided - outcome[1].amount
        );
      } else {
        agreement.capitalProvider.transfer(agreement.capitalProvided);
      }

    } else {

      if (outcome[0].to == agreement.virtualAppUser) {
        ERC20(agreement.tokenAddress).transfer(outcome[0].to, outcome[0].amount);
        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider,
          agreement.capitalProvided - outcome[0].amount
        );
      } else if (outcome[1].to == agreement.virtualAppUser) {
        ERC20(agreement.tokenAddress).transfer(outcome[1].to, outcome[1].amount);
        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider,
          agreement.capitalProvided - outcome[1].amount
        );
      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider,
          agreement.capitalProvided
        );
      }

    }
  }

}
