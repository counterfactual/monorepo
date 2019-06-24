pragma solidity 0.5.9;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./LibChallengeRules.sol";
import "./MAppInstanceAdjudicatorCore.sol";


contract MixinConclude is
  MAppInstanceAdjudicatorCore,
  LibChallengeRules
{

  struct ConclusionProof {
    AppInstanceState penultimateAppInstanceState;
    bytes penultimateSignature;
    AppInstanceState ultimateAppInstanceState;
    bytes ultimateSignature;
  }

  event Concluded(
    bytes32 appInstanceId
  );

  function conclude(ConclusionProof memory proof) public {
    bytes32 appInstanceId = appInstanceIdFromAppInstanceState(
      proof.penultimateAppInstanceState
    );

    require(
      (
        outcomes[appInstanceId].finalizedAt > block.number ||
        outcomes[appInstanceId].finalizedAt == 0
      ),
      "Conclude: channel must not be finalized"
    );

    bytes[] memory signatures = new bytes[](2);
    signatures[0] = proof.penultimateSignature;
    signatures[1] = proof.ultimateSignature;

    require(
      LibChallengeRules.validConclusionProof(
        proof.penultimateAppInstanceState,
        proof.ultimateAppInstanceState,
        signatures
      ),
      "Conclude: must be a valid conclusion proof"
    );

    bytes memory outcome = CounterfactualApp(
      proof.penultimateAppInstanceState.appDefinition
    ).computeOutcome(proof.penultimateAppInstanceState.appAttributes);

    outcomes[appInstanceId] = MaybeOutcome(
      block.number,
      outcome,
      proof.penultimateAppInstanceState
    );

    emit Concluded(appInstanceId);
  }

}
