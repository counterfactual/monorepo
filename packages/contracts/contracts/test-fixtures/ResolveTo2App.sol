pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";
import "../interfaces/TwoPartyOutcome.sol";


contract ResolveTo2App {

  function computeOutcome(bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(TwoPartyOutcome.Outcome.SPLIT_AND_SEND_TO_BOTH_ADDRS);
  }

  function effectType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.EffectType.TWO_PARTY_OUTCOME);
  }

}
