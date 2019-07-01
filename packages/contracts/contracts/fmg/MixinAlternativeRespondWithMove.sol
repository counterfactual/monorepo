pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./LibChallengeRules.sol";
import "./MAppInstanceAdjudicatorCore.sol";


contract MixinAlternativeRespondWithMove is
  MAppInstanceAdjudicatorCore,
  LibChallengeRules
{

  event RespondedWithAlternativeMove(
    AppInstanceState alternativeResponse
  );

  function alternativeRespondWithMove(
    AppInstanceState memory _alternativeAppInstanceState,
    AppInstanceState memory _responseAppInstanceState,
    bytes memory _alternativeSignature,
    bytes memory _responseSignature
  )
    public
  {
    bytes32 appInstanceId = appInstanceIdFromAppInstanceState(_responseAppInstanceState);

    require(
      !isAppInstanceFinalized(appInstanceId),
      "AlternativeRespondWithMove: channel must be open"
    );

    require(
      moveAuthorized(_responseAppInstanceState, _responseSignature),
      "AlternativeRespondWithMove: move must be authorized"
    );

    bytes[] memory signatures = new bytes[](2);
    signatures[0] = _alternativeSignature;
    signatures[1] = _responseSignature;

    require(
      LibChallengeRules.validAlternativeRespondWithMove(
        outcomes[appInstanceId].challengeAppInstanceState,
        _alternativeAppInstanceState,
        _responseAppInstanceState,
        signatures
      ),
      "RespondWithMove: must be a valid response"
    );

    emit RespondedWithAlternativeMove(_responseAppInstanceState);

    bytes memory outcome = CounterfactualApp(
      _alternativeAppInstanceState.appDefinition
    ).computeOutcome(_responseAppInstanceState.appAttributes);

    MaybeOutcome memory updatedOutcome = MaybeOutcome(
      0,
      outcome,
      _responseAppInstanceState
    );

    outcomes[appInstanceId] = updatedOutcome;
  }

}
