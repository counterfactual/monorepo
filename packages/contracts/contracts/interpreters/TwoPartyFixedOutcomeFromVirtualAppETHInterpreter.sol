pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../interfaces/Interpreter.sol";
import "../libs/LibOutcome.sol";


/// @notice
/// Asset: Single Asset
/// OutcomeType: TwoPartyFixedOutcome
/// This is expected to be used for a virtual app in a simple hub topology,
/// hence two different commitments to this interpreter are to be made in the
/// two direct channels, where the commitments differ in the
/// params.beneficiaries field.
contract TwoPartyFixedOutcomeFromVirtualAppETHInterpreter is
  Interpreter
{
  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct SingleAssetTwoPartyIntermediaryAgreement {
    uint256 capitalProvided;
    uint256 expiryBlock;
    address payable[2] beneficiaries;
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

    SingleAssetTwoPartyIntermediaryAgreement memory agreement = abi.decode(
      params,
      (SingleAssetTwoPartyIntermediaryAgreement)
    );

    require(
      block.number < agreement.expiryBlock,
      "Virtual App agreement has expired and is no longer valid."
    );

    if (
      twoPartyOutcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_ONE
    ) {

      if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        agreement.beneficiaries[0].transfer(agreement.capitalProvided);
      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.beneficiaries[0], agreement.capitalProvided
        );
      }

    } else if (
      twoPartyOutcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_TWO
    ) {

      if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        agreement.beneficiaries[1].transfer(agreement.capitalProvided);
      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.beneficiaries[1], agreement.capitalProvided
        );
      }
    } else {

      if (agreement.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {

        agreement.beneficiaries[0].transfer(
          agreement.capitalProvided / 2
        );


        agreement.beneficiaries[1].transfer(
          agreement.capitalProvided - agreement.capitalProvided / 2
        );

      } else {
        ERC20(agreement.tokenAddress).transfer(
          agreement.beneficiaries[0], agreement.capitalProvided / 2
        );

        ERC20(agreement.tokenAddress).transfer(
          agreement.beneficiaries[1],
          agreement.capitalProvided - agreement.capitalProvided / 2
        );
      }

    }

  }

}
