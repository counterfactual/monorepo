pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "./LibAppInstanceState.sol";


contract MAppInstanceAdjudicatorCore is LibAppInstanceState {

  mapping(bytes32 => MaybeOutcome) public outcomes;

  struct MaybeOutcome {
    uint256 finalizedAt;
    bytes outcome;
    AppInstanceState challengeAppInstanceState;
  }

  function getChallenge(bytes32 appInstanceId)
    external
    view
    returns (MaybeOutcome memory)
  {
    return outcomes[appInstanceId];
  }

  function isAppInstanceFinalized(bytes32 appInstanceId)
    public
    view
    returns (bool)
  {
    return (
      outcomes[appInstanceId].finalizedAt < block.number &&
      outcomes[appInstanceId].finalizedAt > 0
    );
  }

  function getOutcomeData(bytes32 appInstanceId)
    public
    view
    returns (bytes memory)
  {
    return outcomes[appInstanceId].outcome;
  }

}
