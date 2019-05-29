pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";


contract Interpreter {

  enum OutcomeType {
    TWO_PARTY_OUTCOME,
    ETH_TRANSFER
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata,
    bytes calldata
  )
    external;
}
