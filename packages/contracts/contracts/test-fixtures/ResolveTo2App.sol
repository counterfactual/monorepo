pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interfaces/Interpreter.sol";
import "../interfaces/TwoPartyOutcome.sol";


contract ResolveTo2App {

  function resolve(bytes calldata)
    external
    pure
    returns (bytes memory)
  {
    return abi.encode(TwoPartyOutcome.Resolution.SPLIT_AND_SEND_TO_BOTH_ADDRS);
  }

  function resolveType()
    external
    pure
    returns (uint256)
  {
    return uint256(Interpreter.ResolutionType.TWO_PARTY_OUTCOME);
  }

}
