pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Signatures.sol";
import "@counterfactual/core/contracts/lib/StaticCall.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


contract StateChannel {

  using Transfer for Transfer.Details;
  using StaticCall for address;
  using Signatures for bytes;

  enum Status {
    OK,
    DISPUTE,
    SETTLED
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
  }

  struct State {
    Status status;
    bytes32 proof;
    address latestSubmitter;
    uint256 nonce;
    uint256 disputeNonce;
    uint256 finalizesAt;
    uint256 disputeCounter;
    uint256 timeoutPeriod;
  }

  uint256 private constant DEFAULT_TIMEOUT = 10;

  Auth public auth;
  State public state;
  Transfer.Details public resolution;

  bytes32 private appHash;
  bytes32 private termsHash;

  modifier onlyOwner() {
    require(
      msg.sender == auth.owner,
      "Sender must be the owner of this object"
    );
    _;
  }

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

  constructor(address[] signingKeys, bytes32 app, bytes32 terms) public {
    auth.owner = msg.sender;
    auth.signingKeys = signingKeys;
    termsHash = terms;
    appHash = app;
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
      state.status = Status.SETTLED;
    }

    state.proof = stateHash;
    state.nonce = nonce;
    state.disputeNonce = 0;
    state.finalizesAt = block.number + timeout;
    state.disputeCounter += 1;
    state.latestSubmitter = msg.sender;
  }

  function createDispute(
    App app,
    bytes checkpoint,
    uint256 nonce,
    uint256 timeout,
    bytes action,
    bytes checkpointSignatures,
    bytes actionSignature
  )
    public
    onlyWhenChannelOpen
  {
    require(
      nonce > state.nonce,
      "Tried to create dispute with outdated state"
    );

    bytes32 h1 = computeStateHash(keccak256(checkpoint), nonce, timeout);
    require(
      checkpointSignatures.verifySignatures(h1, auth.signingKeys),
      "Invalid signatures"
    );

    uint256 idx = app.addr.staticcall_as_uint256(
      abi.encodePacked(app.turnTaker, checkpoint)
    );
    address turnTaker = auth.signingKeys[idx];
    bytes32 h2 = computeActionHash(turnTaker, keccak256(checkpoint), action);
    require(
      turnTaker == actionSignature.recoverKey(h2, 0),
      "Action must have been signed by correct turn taker"
    );

    bytes memory newState = app.addr.staticcall_as_bytes(
      abi.encodePacked(app.reducer, checkpoint, action)
    );

    state.proof = keccak256(newState);
    state.nonce = nonce;
    state.disputeNonce = 0;
    state.finalizesAt = block.number + timeout;
    state.disputeCounter += 1;
    state.status = Status.DISPUTE;
    state.latestSubmitter = msg.sender;
  }

  function progressDispute(
    App app,
    bytes fromState,
    bytes action,
    bytes signatures
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

    state.proof = keccak256(newState);
    state.disputeNonce += 1;
    state.finalizesAt = block.number + DEFAULT_TIMEOUT;
    state.status = Status.DISPUTE;
    state.latestSubmitter = msg.sender;

  }

  function cancelDispute(
    bytes32 stateHash,
    bytes signatures
  )
    public
    onlyWhenChannelDispute
  {
    bytes32 h = computeStateHash(
      state.proof,
      state.nonce,
      DEFAULT_TIMEOUT
    );

    require(
      signatures.verifySignatures(h, auth.signingKeys),
      "Invalid signatures"
    );

    state.disputeNonce = 0;
    state.finalizesAt = 0;
    state.status = Status.OK;
    state.latestSubmitter = msg.sender;
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
    if (s.status == Status.OK) {
      return false;
    } else if (s.status == Status.DISPUTE) {
      return block.number >= s.finalizesAt;
    } else if (s.status == Status.SETTLED) {
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
    bytes action
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
        action
      )
    );
  }

}
