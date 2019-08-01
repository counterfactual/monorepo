pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./LibChallengeRules.sol";
import "./MAppInstanceAdjudicatorCore.sol";


contract MixinChallenge is
  MAppInstanceAdjudicatorCore,
  LibChallengeRules
{

  using SafeMath for uint;

  event ChallengeCreated(
    bytes32 appInstanceId,
    AppInstanceState commitment,
    uint256 finalizedAt
  );

  function challenge(
    AppInstanceState memory agreedAppInstanceState,
    AppInstanceState memory challengeAppInstanceState,
    bytes[] memory signatures
  ) public {

    require(
      !isAppInstanceFinalized(appInstanceIdFromAppInstanceState(agreedAppInstanceState)),
      "Challenge: channel must be open"
    );

    require(
      moveAuthorized(agreedAppInstanceState, signatures[0]),
      "Challenge: agreedAppInstanceState not authorized"
    );

    require(
      moveAuthorized(challengeAppInstanceState, signatures[1]),
      "Challenge: challengeAppInstanceState not authorized"
    );

    require(
      LibChallengeRules.validTransition(agreedAppInstanceState, challengeAppInstanceState)
    );

    bytes32 appInstanceId = appInstanceIdFromAppInstanceState(
      agreedAppInstanceState
    );

    bytes memory outcome = CounterfactualApp(
      challengeAppInstanceState.appDefinition
    ).computeOutcome(challengeAppInstanceState.appAttributes);

    outcomes[appInstanceId] = MaybeOutcome(
      block.number.add(challengeAppInstanceState.challengeTimeout),
      outcome,
      challengeAppInstanceState
    );

    // PISA code
    //
    // DataRegistry(dataRegistry).setHash(
    //   challengeAppInstanceState.nonce,
    //   abi.encode(
    //     MaybeOutcome(
    //       block.number.add(challengeAppInstanceState.challengeTimeout),
    //       outcome,
    //       challengeAppInstanceState
    //     )
    //   )
    // );

    emit ChallengeCreated(
      appInstanceId,
      challengeAppInstanceState,
      block.number.add(challengeAppInstanceState.challengeTimeout)
    );
  }

}
