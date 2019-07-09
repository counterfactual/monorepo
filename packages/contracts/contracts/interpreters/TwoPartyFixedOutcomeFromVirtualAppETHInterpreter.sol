pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";
import "../libs/LibOutcome.sol";


contract TwoPartyFixedOutcomeFromVirtualAppETHInterpreter is
  Interpreter
{

  struct SingleAssetTwoPartyIntermediaryAgreement {
    uint256 capitalProvided;
    uint256 expiryBlock;
    address payable[2] beneficiaries;
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
    )

      agreement.beneficiaries[0].transfer(agreement.capitalProvided);

    else if (
      twoPartyOutcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_TWO
    )

      agreement.beneficiaries[1].transfer(agreement.capitalProvided);

    else if (
      twoPartyOutcome == LibOutcome.TwoPartyFixedOutcome.SPLIT_AND_SEND_TO_BOTH_ADDRS
    ) {

      agreement.beneficiaries[0].transfer(
        agreement.capitalProvided / 2
      );

      agreement.beneficiaries[1].transfer(
        agreement.capitalProvided - agreement.capitalProvided / 2
      );

    } else revert("Outcome received was invalid");

  }

}
