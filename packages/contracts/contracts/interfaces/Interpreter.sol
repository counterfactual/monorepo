pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";


contract Interpreter {

  enum OutcomeType {
    TWO_PARTY_FIXED_OUTCOME,
    TWO_PARTY_DYNAMIC_OUTCOME,
    ETH_TRANSFER
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata,
    bytes calldata
  )
    external;
}
