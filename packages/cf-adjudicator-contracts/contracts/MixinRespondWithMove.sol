pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./LibChallengeRules.sol";
import "./MAppInstanceAdjudicatorCore.sol";


contract MixinRespondWithMove is
  MAppInstanceAdjudicatorCore,
  LibChallengeRules
{

  event RespondedWithMove(
    bytes32 appInstanceId,
    AppInstanceState response,
    bytes signature
  );

  function respondWithMove(
    AppInstanceState memory responseAppInstanceState,
    bytes memory signature
  )
    public
  {
    bytes32 appInstanceId = appInstanceIdFromAppInstanceState(
      responseAppInstanceState
    );

    require(
      !isAppInstanceFinalized(appInstanceId),
      "RespondWithMove: channel must be open"
    );

    require(
      moveAuthorized(responseAppInstanceState, signature),
      "RespondWithMove: move must be authorized"
    );

    require(
      LibChallengeRules.validRespondWithMove(
        outcomes[appInstanceId].challengeAppInstanceState,
        responseAppInstanceState,
        signature
      ),
      "RespondWithMove: must be a valid response"
    );

    bytes memory outcome = CounterfactualApp(
      responseAppInstanceState.appDefinition
    ).computeOutcome(responseAppInstanceState.appAttributes);

    MaybeOutcome memory updatedOutcome = MaybeOutcome(
      0,
      outcome,
      responseAppInstanceState
    );

    outcomes[appInstanceId] = updatedOutcome;

    emit RespondedWithMove(
      appInstanceId,
      responseAppInstanceState,
      signature
    );
  }

}
