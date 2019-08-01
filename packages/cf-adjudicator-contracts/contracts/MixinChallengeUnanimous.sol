pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./LibChallengeRules.sol";
import "./MAppInstanceAdjudicatorCore.sol";


contract MixinChallengeUnanimous is
  MAppInstanceAdjudicatorCore,
  LibChallengeRules
{

  using SafeMath for uint;

  event ChallengeCreated(
    bytes32 appInstanceId,
    AppInstanceState commitment,
    uint256 finalizedAt
  );

  function challengeUnanimous(
    AppInstanceState memory appInstanceState,
    bytes[] memory signatures
  ) public {

    require(
      !isAppInstanceFinalized(appInstanceIdFromAppInstanceState(appInstanceState)),
      "Challenge: channel must be open"
    );

    for (uint256 i = 0; i < appInstanceState.participants.length; i++) {
      require(
        appInstanceState.participants[i] ==
        keccak256(abi.encode(appInstanceState)).recover(signatures[i]),
        "ChallengeUnanimous: every participant must have signed the state"
      );
    }

    bytes32 appInstanceId = appInstanceIdFromAppInstanceState(
      appInstanceState
    );

    bytes memory outcome = CounterfactualApp(
      appInstanceState.appDefinition
    ).computeOutcome(appInstanceState.appAttributes);

    outcomes[appInstanceId] = MaybeOutcome(
      block.number.add(appInstanceState.challengeTimeout),
      outcome,
      appInstanceState
    );

    emit ChallengeCreated(
      appInstanceId,
      appInstanceState,
      block.number.add(appInstanceState.challengeTimeout)
    );
  }

}
