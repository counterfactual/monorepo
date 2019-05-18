pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";


contract Interpreter {

  enum ResolutionType {
    TWO_PARTY_OUTCOME,
    ETH_TRANSFER
  }

  function interpret(bytes calldata, bytes calldata) external;
}
