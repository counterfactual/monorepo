pragma solidity 0.5.9;
pragma experimental ABIEncoderV2;

import "./LibAppInstanceState.sol";


contract MAppInstanceAdjudicatorCore is LibAppInstanceState {

  mapping(bytes32 => MaybeOutcome) public outcomes;

  struct MaybeOutcome {
    uint256 finalizedAt;
    bytes outcome;
    AppInstanceState challengeAppInstanceState;
  }

  function isAppInstanceFinalized(bytes32 appInstanceId)
    internal
    view
    returns (bool)
  {
    return (
      outcomes[appInstanceId].finalizedAt < block.number &&
      outcomes[appInstanceId].finalizedAt > 0
    );
  }

}
