pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./LibChallengeRules.sol";
import "./MAppInstanceAdjudicatorCore.sol";


contract MixinRefute is
  MAppInstanceAdjudicatorCore,
  LibChallengeRules
{

  using SafeMath for uint;

  uint256 constant INEFFICIENT_REFUTE_TIMEOUT = 10;

  event Refuted(
    bytes32 appInstanceId,
    AppInstanceState refutation
  );

  function refute(
    AppInstanceState memory refutationAppInstanceState,
    bytes memory signature
  )
    public
  {
    bytes32 appInstanceId = appInstanceIdFromAppInstanceState(
      refutationAppInstanceState
    );

    require(
      !isAppInstanceFinalized(appInstanceId),
      "Refute: channel must be open"
    );

    require(
      moveAuthorized(refutationAppInstanceState, signature),
      "Refute: move must be authorized"
    );

    require(
      LibChallengeRules.validRefute(
        outcomes[appInstanceId].challengeAppInstanceState,
        refutationAppInstanceState,
        signature
      ),
      "Refute: must be a valid refute"
    );

    bytes memory outcome = CounterfactualApp(
      refutationAppInstanceState.appDefinition
    ).computeOutcome(refutationAppInstanceState.appAttributes);

    MaybeOutcome memory updatedOutcome = MaybeOutcome(
      block.number.add(INEFFICIENT_REFUTE_TIMEOUT),
      outcome,
      refutationAppInstanceState
    );

    outcomes[appInstanceId] = updatedOutcome;

    emit Refuted(appInstanceId, refutationAppInstanceState);

  }

}
