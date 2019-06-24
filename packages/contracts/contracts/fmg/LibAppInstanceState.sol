pragma solidity 0.5.9;
pragma experimental ABIEncoderV2;

import "../interfaces/CounterfactualApp.sol";
import "../libs/LibSignature.sol";


contract LibAppInstanceState is LibSignature {

  enum AppInstanceStateType { App, Conclude }

  struct AppInstanceState {
    address appDefinition;
    address[] participants;
    bytes actionTaken;
    bytes appAttributes;
    uint256 challengeTimeout;
    // uint32 commitmentCount;
    uint32 nonce;
    uint32 turnNum;
    uint8 commitmentType;
  }

  // struct CompressedAppInstanceState {
  //   /** Same as AppInstanceState */
  //   address appDefinition;
  //   uint32 nonce;
  //   address[] participants;
  //   uint8 commitmentType;
  //   uint32 turnNum;
  //   uint32 commitmentCount;
  //   bytes outcome;
  //   bytes actionTaken;
  //   /** ------------------------ */
  //   bytes32 appAttributes;
  // }

  function isApp(AppInstanceState memory self) public pure returns (bool) {
    return self.commitmentType == uint(AppInstanceStateType.App);
  }

  function isConclude(AppInstanceState memory self) public pure returns (bool) {
    return self.commitmentType == uint(AppInstanceStateType.Conclude);
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
    AppInstanceState memory channelState
  )
    internal
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        channelState.appDefinition,
        channelState.nonce,
        channelState.participants
      )
    );
  }

  function turnTakerFromAppInstanceState(AppInstanceState memory channelState)
    internal
    pure
    returns (address)
  {
    return channelState.participants[
      channelState.turnNum % channelState.participants.length
    ];
  }

  function requireSignature(
    AppInstanceState memory channelState,
    bytes memory signature
  )
    internal
    pure
  {
    require(
      moveAuthorized(channelState, signature),
      "Correct turn taker must have signed AppInstanceState"
    );
  }

  function moveAuthorized(
    AppInstanceState memory channelState,
    bytes memory signature
  )
    internal
    pure
    returns (bool)
  {
    return turnTakerFromAppInstanceState(channelState) ==
      recoverKey(signature, keccak256(abi.encode(channelState)), 0);
  }

}
