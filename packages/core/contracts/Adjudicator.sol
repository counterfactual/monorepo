pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/StateChannel.sol";
import "@counterfactual/cf-fmg/contracts/Rules.sol";


contract StateReducer is StateChannel {

  using Rules for Rules.State;

  constructor(address[] signingKeys)
    StateChannel(signingKeys)
    public {}

  function forceMove(
    Rules.State yourState,
    Rules.State myState,
    uint8[] memory v,
    bytes32[] memory r,
    bytes32[] memory s
  )
    public
    onlyWhenChannelOpen
  {
    require(Rules.validForceMove(yourState, myState, v, r, s));
    state.update(abi.encode(myState));
  }

  function conclude(
    Rules.State yourState,
    Rules.State myState,
    uint8[] memory v,
    bytes32[] memory r,
    bytes32[] memory s
  )
    public
    onlyWhenGameOngoing
  {
    require(Rules.validConclusionProof(yourState, myState, v, r, s));
    state.finalize(abi.encode(myState));
  }

  function refute(
    Rules.State currentState,
    Rules.State refutationState,
    uint8 v, bytes32 r, bytes32 s
  )
    public
    onlyWhenChannelDispute
    verifyLatestSignedState(abi.encode(currentState))
  {
    require(Rules.validRefute(currentState, refutationState, v, r, s));
    state.resolve();
  }

  function respondWithMove(
    Rules.State currentState,
    Rules.State nextState,
    uint8 v, bytes32 r, bytes32 s
  )
    public
    onlyWhenChannelDispute
    verifyLatestSignedState(abi.encode(currentState))
  {
    require(Rules.validRespondWithMove(currentState, nextState, v, r, s));
    state.resolve();
  }

  function alternativeRespondWithMove(
    Rules.State currentState,
    Rules.State alternativeState,
    Rules.State nextState,
    uint8[] memory v,
    bytes32[] memory r,
    bytes32[] memory s
  )
    public
    onlyWhenChannelDispute
    verifyLatestSignedState(abi.encode(currentState))
  {
    require(
      Rules.validAlternativeRespondWithMove(
        currentState,
        alternativeState,
        nextState,
        v, r, s
      )
    );
    state.resolve();
  }

  function validTransition(
    Rules.State fromState,
    Rules.State toState
  )
    public
    view
    returns (bool)
  {
    return Rules.validTransition(fromState, toState);
  }

  modifier onlyWhenGameOngoing() {
    require(
      !(state.meta.finalizesAt > 0 && !(state.meta.finalizesAt > now))
    );
    _;
  }

}
