pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "./LibAppInstanceState.sol";
import "../interfaces/CounterfactualApp.sol";


contract LibChallengeRules is LibAppInstanceState {

  function validChallenge(
    AppInstanceState memory _fromAppInstanceState,
    AppInstanceState memory _toAppInstanceState,
    bytes[] memory signatures
  )
    internal
    pure
    returns (bool)
  {

    // channel states must be signed by the appropriate participant
    requireSignature(_fromAppInstanceState, signatures[0]);
    requireSignature(_toAppInstanceState, signatures[1]);

    return validTransition(_fromAppInstanceState, _toAppInstanceState);
  }

  function validConclusionProof(
    AppInstanceState memory _fromAppInstanceState,
    AppInstanceState memory _toAppInstanceState,
    bytes[] memory signatures
  )
    internal
    pure
    returns (bool)
  {

    // channel states must be signed by the appropriate participant
    requireSignature(_fromAppInstanceState, signatures[0]);
    requireSignature(_toAppInstanceState, signatures[1]);

    // first move must be a concluded AppInstanceState
    // (transition rules will ensure this for the other channel states)
    require(
      isConclude(_fromAppInstanceState),
      "fromAppInstanceState must be Conclude"
    );

    // must be a valid transition
    return validTransition(_fromAppInstanceState, _toAppInstanceState);
  }

  function validRefute(
    AppInstanceState memory _challengeAppInstanceState,
    AppInstanceState memory _refutationAppInstanceState,
    bytes memory signature
  )
    internal
    pure
    returns (bool)
  {
    require(
      _refutationAppInstanceState.turnNum > _challengeAppInstanceState.turnNum,
      "the refutationAppInstanceState must have a higher nonce"
    );

    require(
      turnTakerFromAppInstanceState(_refutationAppInstanceState) ==
      turnTakerFromAppInstanceState(_challengeAppInstanceState),
      "refutationAppInstanceState must have same mover as challengeAppInstanceState"
    );

    // ... and be signed (by that mover)
    requireSignature(_refutationAppInstanceState, signature);

    return true;
  }

  function validRespondWithMove(
    AppInstanceState memory _challengeAppInstanceState,
    AppInstanceState memory _nextAppInstanceState,
    bytes memory signature
  )
    internal
    pure
    returns (bool)
  {
    // check that the challengee's signature matches
    requireSignature(_nextAppInstanceState, signature);

    require(
      validTransition(_challengeAppInstanceState, _nextAppInstanceState),
      "must be a valid transition"
    );

    return true;
  }

  function validAlternativeRespondWithMove(
    AppInstanceState memory _challengeAppInstanceState,
    AppInstanceState memory _alternativeAppInstanceState,
    AppInstanceState memory _nextAppInstanceState,
    bytes[] memory signatures
  )
    internal
    pure
    returns (bool)
  {

    // checking the alternative AppInstanceState:
    require(
      appInstanceIdFromAppInstanceState(_challengeAppInstanceState) ==
      appInstanceIdFromAppInstanceState(_alternativeAppInstanceState),
      "alternativeAppInstanceState must have the right channel"
    );

    require(
      _challengeAppInstanceState.turnNum == _alternativeAppInstanceState.turnNum,
      "alternativeAppInstanceState must have the same nonce as the challenge channelState"
    );

    // .. it must be signed (by the challenger)
    requireSignature(_alternativeAppInstanceState, signatures[0]);

    // checking the nextAppInstanceState:
    // .. it must be signed (my the challengee)
    requireSignature(_nextAppInstanceState, signatures[1]);

    require(
      validTransition(_alternativeAppInstanceState, _nextAppInstanceState),
      "it must be a valid transition of the appcommitment (from the alternative channelState)"
    );

    return true;
  }

  function validTransition(
    AppInstanceState memory  _fromAppInstanceState,
    AppInstanceState memory _toAppInstanceState
  )
    internal
    pure
    returns (bool)
  {

    require(
      appInstanceIdFromAppInstanceState(_toAppInstanceState) == appInstanceIdFromAppInstanceState(_fromAppInstanceState),
      "Invalid transition: appInstanceId must match on toAppInstanceState"
    );

    require(
      _toAppInstanceState.turnNum == _fromAppInstanceState.turnNum + 1,
      "Invalid transition: turnNum must increase by 1"
    );

    if (isApp(_fromAppInstanceState)) {
      return validTransitionFromApp(_fromAppInstanceState, _toAppInstanceState);
    } else if (isConclude(_fromAppInstanceState)) {
      return validTransitionFromConclude(_fromAppInstanceState, _toAppInstanceState);
    }

    return true;
  }

  function validTransitionFromApp(
    AppInstanceState memory _fromAppInstanceState,
    AppInstanceState memory _toAppInstanceState
  )
    internal
    pure
    returns (bool)
  {
    if (isApp(_toAppInstanceState)) {
      require(
        validAppTransition(_fromAppInstanceState, _toAppInstanceState),
        "Invalid transition from App: transition must be valid"
      );
    } else {
      require(
        isConclude(_toAppInstanceState),
        "Invalid transition from App: commitmentType must be Conclude"
      );
      require(
        outcomesEqual(_fromAppInstanceState, _toAppInstanceState),
        "Invalid transition from App: allocations must be equal"
      );
    }
    return true;
  }

  function validTransitionFromConclude(
    AppInstanceState memory _fromAppInstanceState,
    AppInstanceState memory _toAppInstanceState
  )
    internal
    pure
    returns (bool)
  {

    require(
      isConclude(_toAppInstanceState),
      "Invalid transition from Conclude: commitmentType must be Conclude"
    );

    require(
      outcomesEqual(_fromAppInstanceState, _toAppInstanceState),
      "Invalid transition from Conclude: allocations must be equal"
    );

    return true;
  }

  function validAppTransition(
    AppInstanceState memory _fromAppInstanceState,
    AppInstanceState memory _toAppInstanceState
  )
    internal
    pure
    returns (bool)
  {
    bytes memory newAppAttributes = CounterfactualApp(
      _fromAppInstanceState.appDefinition
    ).applyAction(
      _fromAppInstanceState.appAttributes,
      _toAppInstanceState.actionTaken
    );

    return (
      keccak256(newAppAttributes) == keccak256(_toAppInstanceState.appAttributes)
    );
  }
}
