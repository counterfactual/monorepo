pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Signatures.sol";
import "@counterfactual/core/contracts/lib/StaticCall.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


contract StateChannel {
  event DisputeStarted(
    address sender,
    uint256 disputeCounter,
    bytes32 stateHash,
    uint256 nonce,
    uint256 finalizesAt
  );

  event DisputeProgressed(
    address sender,
    bytes fromState,
    bytes action,
    bytes toState,
    uint256 disputeNonce,
    uint256 finalizesAt
  );

  event DisputeFinalized(
    address sender,
    bytes finalState
  );

  event DisputeCancelled(
    address sender
  );

  using Transfer for Transfer.Details;
  using StaticCall for address;
  using Signatures for bytes;

  enum Status {
    ON,
    DISPUTE,
    OFF
  }

  struct Auth {
    address owner;
    address[] signingKeys;
  }

  struct App {
    address addr;
    bytes4 reducer;
    bytes4 resolver;
    bytes4 turnTaker;
    bytes4 isStateFinal;
  }

  struct State {
    Status status;
    bytes32 proof;
    address latestSubmitter;
    uint256 nonce;
    uint256 disputeNonce;
    uint256 finalizesAt;
    uint256 disputeCounter;
  }

  Auth public auth;
  State public state;
  Transfer.Details public resolution;

  bytes32 private appHash;
  bytes32 private termsHash;
  uint256 private defaultTimeout;

  modifier onlyWhenChannelOpen() {
    require(
      !isSettled(state),
      "State has already been settled"
    );
    _;
  }

  modifier onlyWhenChannelDispute() {
    require(
      state.status == Status.DISPUTE,
      "State is not being disputed"
    );
    _;
  }

  modifier onlyWhenChannelClosed() {
    require(isSettled(state), "State is still unsettled");
    _;
  }

  constructor(
    address owner,
    address[] signingKeys,
    bytes32 app,
    bytes32 terms,
    uint256 timeout
  ) public {
    auth.owner = owner;
    auth.signingKeys = signingKeys;
    termsHash = terms;
    appHash = app;
    defaultTimeout = timeout;
  }

  function getOwner() external view returns (address) {
    return auth.owner;
  }

  function getSigningKeys() external view returns (address[]) {
    return auth.signingKeys;
  }

  function latestNonce() external view returns (uint256) {
    return state.nonce;
  }

  function isClosed() external view returns (bool) {
    return isSettled(state);
  }

  function getResolution() public view returns (Transfer.Details) {
    return resolution;
  }

  function setState(
    bytes32 stateHash,
    uint256 nonce,
    uint256 timeout,
    bytes signatures
  )
    public
    onlyWhenChannelOpen
  {
    if (msg.sender != auth.owner) {
      bytes32 h = computeStateHash(stateHash, nonce, timeout);
      require(
        signatures.verifySignatures(h, auth.signingKeys),
        "Invalid signatures"
      );
    }

    if (timeout > 0) {
      require(
        nonce > state.nonce,
        "Tried to set state with non-new state"
      );
      state.status = Status.DISPUTE;
    } else {
      require(
        nonce >= state.nonce,
        "Tried to finalize state with stale state"
      );
      state.status = Status.OFF;
    }

    state.proof = stateHash;
    state.nonce = nonce;
    state.disputeNonce = 0;
    state.finalizesAt = block.number + timeout;
    state.disputeCounter += 1;
    state.latestSubmitter = msg.sender;
  }

  function _finalizeState(
    App app,
    bytes state
  )
    private
  {
    // This call will fail if app doesn't have an `isStateFinal` method
    bool stateIsFinal = app.addr.staticcall_as_bool(
      abi.encodePacked(app.isStateFinal, state)
    );

    require(stateIsFinal, "App state must be final");

    state.proof = keccak256(state);
    state.status = Status.OFF;
    emit DisputeFinalized(msg.sender, state);
  }

  function createDispute(
    App app,
    bytes checkpoint,
    uint256 nonce,
    uint256 timeout,
    bytes action,
    bytes checkpointSignatures,
    bytes actionSignature,
    bool finalize
  )
    public
    onlyWhenChannelOpen
  {
    require(
      nonce > state.nonce,
      "Tried to create dispute with outdated state"
    );

    bytes32 stateHash = computeStateHash(keccak256(checkpoint), nonce, timeout);
    require(
      checkpointSignatures.verifySignatures(stateHash, auth.signingKeys),
      "Invalid signatures"
    );

    uint256 idx = app.addr.staticcall_as_uint256(
      abi.encodePacked(app.turnTaker, checkpoint)
    );
    address turnTaker = auth.signingKeys[idx];
    bytes32 actionHash = computeActionHash(
      turnTaker,
      keccak256(checkpoint),
      action,
      state.nonce,
      state.disputeNonce
    );
    require(
      turnTaker == actionSignature.recoverKey(actionHash, 0),
      "Action must have been signed by correct turn taker"
    );

    uint256 finalizesAt = block.number + timeout;

    bytes memory newState = app.addr.staticcall_as_bytes(
      abi.encodePacked(app.reducer, checkpoint, action)
    );

    emit DisputeStarted(msg.sender, state.disputeCounter + 1, stateHash, nonce, finalizesAt);

    if (finalize) {
      _finalizeState(app, newState);
    } else {
      state.nonce = nonce;
      state.disputeNonce = 0;
      state.finalizesAt = finalizesAt;
      state.disputeCounter += 1;
      state.status = Status.DISPUTE;
      state.latestSubmitter = msg.sender;
      emit DisputeProgressed(msg.sender, checkpoint, action, newState, state.disputeNonce, finalizesAt);
    }
  }

  function progressDispute(
    App app,
    bytes fromState,
    bytes action,
    bytes signatures,
    bool finalize
  )
    public
    onlyWhenChannelDispute
  {
    require(
      keccak256(fromState) == state.proof,
      "Invalid state submitted"
    );

    require(
      keccak256(abi.encode(app)) == appHash,
      "Tried to resolve dispute with non-agreed upon app"
    );

    uint256 idx = app.addr.staticcall_as_uint256(
      abi.encodePacked(app.turnTaker, fromState)
    );

    require(
      auth.signingKeys[idx] == signatures.recoverKey(keccak256(action), 0),
      "Action must have been signed by correct turn taker"
    );

    bytes memory newState = app.addr.staticcall_as_bytes(
      abi.encodePacked(app.reducer, fromState, action)
    );

    if (finalize) {
      _finalizeState(app, newState);
    } else {
      state.proof = keccak256(newState);
      state.disputeNonce += 1;
      state.finalizesAt = block.number + defaultTimeout;
      state.status = Status.DISPUTE;
      state.latestSubmitter = msg.sender;
      emit DisputeProgressed(msg.sender, fromState, action, newState, state.disputeNonce, state.finalizesAt);
    }
  }

  function cancelDispute(
    bytes signatures
  )
    public
    onlyWhenChannelDispute
  {
    bytes32 stateHash = computeStateHash(
      state.proof,
      state.nonce,
      defaultTimeout
    );

    require(
      signatures.verifySignatures(stateHash, auth.signingKeys),
      "Invalid signatures"
    );

    state.disputeNonce = 0;
    state.finalizesAt = 0;
    state.status = Status.ON;
    state.latestSubmitter = msg.sender;
    emit DisputeCancelled(msg.sender);
  }

  function setResolution(
    App app,
    bytes finalState,
    bytes terms
  )
    public
    onlyWhenChannelClosed
  {
    require(
      keccak256(finalState) == state.proof,
      "Tried to set resolution with incorrect final state"
    );

    require(
      keccak256(terms) == termsHash,
      "Tried to set resolution with non-agreed upon terms"
    );

    require(
      keccak256(abi.encode(app)) == appHash,
      "Tried to set resolution with non-agreed upon app"
    );

    resolution = app.addr.staticcall_as_TransferDetails(
      abi.encodePacked(app.resolver, finalState, terms)
    );
  }

  function isSettled(State s) public view returns (bool) {
    if (s.status == Status.ON) {
      return false;
    } else if (s.status == Status.DISPUTE) {
      return block.number >= s.finalizesAt;
    } else if (s.status == Status.OFF) {
      return true;
    }
  }

  function computeStateHash(
    bytes32 stateHash,
    uint256 nonce,
    uint256 timeout
  )
    internal
    view
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        auth.signingKeys,
        nonce,
        timeout,
        stateHash
      )
    );
  }

  function computeActionHash(
    address turnTaker,
    bytes32 previousState,
    bytes action,
    uint256 setStateNonce,
    uint256 disputeNonce
  )
    internal
    view
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        turnTaker,
        previousState,
        action,
        setStateNonce,
        disputeNonce
      )
    );
  }

}
