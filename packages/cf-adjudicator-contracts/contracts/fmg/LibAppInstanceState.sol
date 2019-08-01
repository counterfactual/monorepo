pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

import "../interfaces/CounterfactualApp.sol";


contract LibAppInstanceState {

  using ECDSA for bytes32;

  enum AppInstanceStateType { App, Conclude }

  struct AppInstanceState {

    /* The address of the contract defining applyAction and computeOutcome */
    address appDefinition;

    /* Array of addresses responsible for signing updates */
    address[] participants;

    /* Type of this AppInstanceState: RUNNING or CONCLUDE */
    AppInstanceStateType stateType;

    /* Encoded action data for call to applyAction */
    bytes actionTaken;

    /* Current state of the AppInstance to be interpreted by appDefinition contract */
    bytes appAttributes;

    /* Timeout that would start on-chain were this state used in challenge */
    uint256 challengeTimeout;

    /* Unique identifier for this AppInstance */
    uint32 nonce;

    /* Current version number of this state in the AppInstance */
    uint32 versionNum;

  }

  function isApp(AppInstanceState memory self) public pure returns (bool) {
    return self.stateType == AppInstanceStateType.App;
  }

  function isConclude(AppInstanceState memory self) public pure returns (bool) {
    return self.stateType == AppInstanceStateType.Conclude;
  }

  function outcomesEqual(
    AppInstanceState memory s1,
    AppInstanceState memory s2
  )
    public
    pure
    returns (bool)
  {
    bytes memory o1 = CounterfactualApp(s1.appDefinition)
      .computeOutcome(s1.appAttributes);

    bytes memory o2 = CounterfactualApp(s2.appDefinition)
      .computeOutcome(s2.appAttributes);

    return keccak256(o1) == keccak256(o2);
  }

  function appInstanceIdFromAppInstanceState(
    AppInstanceState memory appInstanceState
  )
    internal
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encode(
        appInstanceState.nonce,
        appInstanceState.participants
      )
    );
  }

  function turnTakerFromAppInstanceState(
    AppInstanceState memory appInstanceState
  )
    internal
    pure
    returns (address)
  {
    return appInstanceState.participants[
      appInstanceState.versionNum % appInstanceState.participants.length
    ];
  }

  function requireSignature(
    AppInstanceState memory appInstanceState,
    bytes memory signature
  )
    internal
    pure
  {
    require(
      moveAuthorized(appInstanceState, signature),
      "Correct turn taker must have signed AppInstanceState"
    );
  }

  function moveAuthorized(
    AppInstanceState memory appInstanceState,
    bytes memory signature
  )
    internal
    pure
    returns (bool)
  {
    return turnTakerFromAppInstanceState(appInstanceState) ==
      keccak256(abi.encode(appInstanceState)).recover(signature);
  }

}
