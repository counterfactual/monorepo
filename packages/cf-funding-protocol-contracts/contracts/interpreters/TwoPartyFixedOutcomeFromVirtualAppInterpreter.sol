pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../Interpreter.sol";
import "../libs/LibOutcome.sol";


/// @notice
/// Asset: Single Asset
/// OutcomeType: TwoPartyFixedOutcome
/// This is expected to be used for a virtual app in a simple hub topology,
/// hence two different commitments to this interpreter are to be made in the
/// two direct channels, where the commitments differ in the
/// params.beneficiaries field.
contract TwoPartyFixedOutcomeFromVirtualAppInterpreter is
  Interpreter
{

  using SafeMath for uint256;

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct VirtualAppIntermediaryAgreement {
    uint256 capitalProvided;
    address payable capitalProvider;
    address payable virtualAppUser;
    address tokenAddress;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata outcome,
    bytes calldata params
  )
    external
  {
    LibOutcome.TwoPartyFixedOutcome twoPartyOutcome = abi.decode(
      outcome,
      (LibOutcome.TwoPartyFixedOutcome)
    );

    VirtualAppIntermediaryAgreement memory agreement = abi.decode(
      params,
      (VirtualAppIntermediaryAgreement)
    );

    if (
      twoPartyOutcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_ONE
    ) {

      if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        agreement.virtualAppUser.transfer(agreement.capitalProvided);
      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.virtualAppUser, agreement.capitalProvided
        );
      }

    } else if (
      twoPartyOutcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_TWO
    ) {

      if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        agreement.capitalProvider.transfer(agreement.capitalProvided);
      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider, agreement.capitalProvided
        );
      }

    } else {

      if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

        agreement.virtualAppUser.transfer(
          agreement.capitalProvided.div(2)
        );


        agreement.capitalProvider.transfer(
          agreement.capitalProvided.sub(agreement.capitalProvided.div(2))
        );

      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.virtualAppUser, agreement.capitalProvided.div(2)
        );

        ERC20(agreement.tokenAddress).transfer(
          agreement.capitalProvider,
          agreement.capitalProvided.sub(agreement.capitalProvided.div(2))
        );
      }

    }

  }

}
