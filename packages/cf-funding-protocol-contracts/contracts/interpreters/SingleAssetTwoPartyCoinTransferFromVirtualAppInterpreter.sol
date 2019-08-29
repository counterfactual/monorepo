pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../Interpreter.sol";
import "../libs/LibOutcome.sol";


/// @notice
///
/// Interprets a finalized AppInstance whose outcome is of type
/// CoinTransfer. While CoinTransfer outcome contains `to` and `coinAddress`
/// fields, those fields are *ignored* by this interpreter. Only the `amount`
/// field is used.
contract SingleAssetTwoPartyCoinTransferFromVirtualAppInterpreter
  is Interpreter
{

  using SafeMath for uint256;

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct VirtualAppIntermediaryAgreement {
    uint256 capitalProvided;
    address payable capitalProvider;
    address payable virtualAppUser;
    address tokenAddress;
  }

  // NOTE: This is useful for writing tests, but is bad practice
  // to have in the contract when deploying it. We do not want people
  // to send funds to this contract in any scenario.
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
      outcome[0].amount.add(outcome[1].amount) == agreement.capitalProvided,
      "Invalid outcome. Sum of amounts must equal to capital provided."
    );

    if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

      if (outcome[0].to == agreement.virtualAppUser) {
        outcome[0].to.transfer(outcome[0].amount);
        agreement.capitalProvider.transfer(
          agreement.capitalProvided.sub(outcome[0].amount)
        );
      } else if (outcome[1].to == agreement.virtualAppUser) {
        outcome[1].to.transfer(outcome[1].amount);
        agreement.capitalProvider.transfer(
          agreement.capitalProvided.sub(outcome[1].amount)
        );
      } else {
        agreement.capitalProvider.transfer(agreement.capitalProvided);
      }

    } else {

      if (outcome[0].to == agreement.virtualAppUser) {
        ERC20(agreement.tokenAddress).transfer(outcome[0].to, outcome[0].amount);
        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider,
          agreement.capitalProvided.sub(outcome[0].amount)
        );
      } else if (outcome[1].to == agreement.virtualAppUser) {
        ERC20(agreement.tokenAddress).transfer(outcome[1].to, outcome[1].amount);
        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider,
          agreement.capitalProvided.sub(outcome[1].amount)
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
