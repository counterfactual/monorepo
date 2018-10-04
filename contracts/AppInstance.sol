pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "./lib/Signatures.sol";
import "./lib/StaticCall.sol";
import "./lib/Transfer.sol";


/// @title AppInstance - A contract that defines a state channel application
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports the adjudication and timeout guarantees required by state channel
/// applications to be secure in a gas and storage-optimized manner. Resolves to a
/// `Transfer.Transaction` when the channel is closed.
contract AppInstance {

  using StaticCall for address;
  using Signatures for bytes;

  event DisputeStarted(
    address sender,
    uint256 disputeCounter,
    bytes32 appStateHash,
    uint256 nonce,
    uint256 finalizesAt
  );

  event DisputeProgressed(
    address sender,
    bytes appState,
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
    bytes4 applyAction;
    bytes4 resolve;
    bytes4 getTurnTaker;
    bytes4 isStateTerminal;
  }

  struct State {
    Status status;
    bytes32 appStateHash;
    address latestSubmitter;
    uint256 nonce;
    uint256 disputeNonce;
    uint256 finalizesAt;
    uint256 disputeCounter;
  }

  Auth public auth;
  State public state;
  Transfer.Transaction public resolution;

  bytes32 private appHash;
  bytes32 private termsHash;
  uint256 private defaultTimeout;

  modifier onlyWhenChannelOpen() {
    require(
      !isStateTerminal(state),
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
    require(isStateTerminal(state), "State is still unsettled");
    _;
  }

  /// @notice Contract constructor
  /// @param owner An address which is allowed to set state. Typically an address off a multisig wallet.
  /// @param signingKeys An array of addresses which can set state with unanimous consent
  /// @param app Hash of the application's interface
  /// @param terms Hash of a `Transfer.TransactionLimit` object commiting to the terms of the app; the resolution is not allowed to exceed this limit
  /// @param timeout The default timeout (in blocks) in case of dispute
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

  /// @notice A getter function for the owner of the state channel
  /// @return The address of the `owner`
  function getOwner() external view returns (address) {
    return auth.owner;
  }

  /// @notice A getter function for the signing keys of the state channel
  /// @return The addresses of the `signingKeys`
  function getSigningKeys() external view returns (address[]) {
    return auth.signingKeys;
  }

  /// @notice A getter function for the latest agreed nonce of the state channel
  /// @return The uint value of the latest agreed nonce
  function latestNonce() external view returns (uint256) {
    return state.nonce;
  }

  /// @notice A helper method to determine whether or not the channel is closed
  /// @return A boolean representing whether or not the state channel is closed
  function isClosed() external view returns (bool) {
    return isStateTerminal(state);
  }

  /// @notice A getter function for the resolution if one is set
  /// @return A `Transfer.Transaction` object representing the resolution of the channel
  function getResolution() public view returns (Transfer.Transaction) {
    return resolution;
  }

  /// @notice Set the application state to a given value.
  /// This value must have been signed off by all parties to the channel, that is,
  /// this must be called with the correct msg.sender or signatures must be provided.
  /// @param appStateHash The hash of the agreed upon state. Typically this is the latest signed state.
  /// @param nonce The nonce of the agreed upon state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @param signatures A sorted bytes string of concatenated signatures of each signingKey
  /// @dev This function is only callable when the state channel is in an ON state.
  function setState(
    bytes32 appStateHash,
    uint256 nonce,
    uint256 timeout,
    bytes signatures
  )
    public
    onlyWhenChannelOpen
  {
    if (msg.sender != auth.owner) {
      bytes32 h = computeStateHash(appStateHash, nonce, timeout);
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

    state.appStateHash = appStateHash;
    state.nonce = nonce;
    state.disputeNonce = 0;
    state.finalizesAt = block.number + timeout;
    state.disputeCounter += 1;
    state.latestSubmitter = msg.sender;
  }

  /// @notice Create a dispute regarding the latest signed state and immediately after,
  /// performs a unilateral action to update it.
  /// @param app An `App` struct specifying the application logic
  /// @param appState The ABI encoded application state
  /// @param nonce The nonce of the agreed upon state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @param action The ABI encoded action the submitter wishes to take
  /// @param appStateSignatures A sorted bytes string of concatenated signatures on the
  /// `appState` state, signed by all `signingKeys`
  /// @param actionSignature A bytes string of a single signature by the address of the
  /// signing key for which it is their turn to take the submitted `action`
  /// @param claimFinal A boolean representing a claim by the caller that the action
  /// progresses the state of the application to a terminal / finalized state
  /// @dev Note this function is only callable when the state channel is in an ON state
  function createDispute(
    App app,
    bytes appState,
    uint256 nonce,
    uint256 timeout,
    bytes action,
    bytes appStateSignatures,
    bytes actionSignature,
    bool claimFinal
  )
    public
    onlyWhenChannelOpen
  {
    require(
      nonce > state.nonce,
      "Tried to create dispute with outdated state"
    );

    bytes32 appStateHash = keccak256(appState);
    require(
      appStateSignatures.verifySignatures(
        computeStateHash(appStateHash, nonce, timeout),
        auth.signingKeys
      ),
      "Invalid signatures"
    );

    address turnTaker = getAppTurnTaker(app, appState);

    bytes32 actionHash = computeActionHash(
      turnTaker,
      appStateHash,
      action,
      nonce,
      state.disputeNonce
    );
    require(
      turnTaker == actionSignature.recoverKey(actionHash, 0),
      "Action must have been signed by correct turn taker"
    );

    emit DisputeStarted(
      msg.sender,
      state.disputeCounter + 1,
      appStateHash,
      nonce,
      block.number + timeout
    );

    bytes memory newAppState = executeAppApplyAction(app, appState, action);

    state.appStateHash = keccak256(newAppState);
    state.nonce = nonce;
    state.disputeNonce = 0;
    state.disputeCounter += 1;
    state.latestSubmitter = msg.sender;

    if (claimFinal) {
      require(isAppStateTerminal(app, newAppState));
      state.finalizesAt = block.number;
      state.status = Status.OFF;

      emit DisputeFinalized(msg.sender, newAppState);
    } else {
      state.finalizesAt = block.number + timeout;
      state.status = Status.DISPUTE;

      emit DisputeProgressed(
        msg.sender,
        appState,
        action,
        newAppState,
        state.disputeNonce,
        block.number + timeout
      );
    }
  }

  /// @notice Respond to a dispute with a valid action
  /// @param app An `App` struct specifying the application logic
  /// @param appState The ABI encoded latest signed application state
  /// @param action The ABI encoded action the submitter wishes to take
  /// @param actionSignature A bytes string of a single signature by the address of the
  /// signing key for which it is their turn to take the submitted `action`
  /// @param claimFinal If set, the caller claims that the action progresses the state
  /// to a terminal / finalized state
  /// @dev This function is only callable when the state channel is in a DISPUTE state
  function progressDispute(
    App app,
    bytes appState,
    bytes action,
    bytes actionSignature,
    bool claimFinal
  )
    public
    onlyWhenChannelDispute
  {
    require(
      keccak256(appState) == state.appStateHash,
      "Invalid state submitted"
    );

    require(
      keccak256(abi.encode(app)) == appHash,
      "Tried to resolve dispute with non-agreed upon app"
    );

    address turnTaker = getAppTurnTaker(app, appState);

    require(
      turnTaker == actionSignature.recoverKey(keccak256(action), 0),
      "Action must have been signed by correct turn taker"
    );

    bytes memory newAppState = executeAppApplyAction(app, appState, action);

    state.appStateHash = keccak256(newAppState);
    state.disputeNonce += 1;
    state.latestSubmitter = msg.sender;

    if (claimFinal) {
      require(isAppStateTerminal(app, newAppState));
      state.finalizesAt = block.number;
      state.status = Status.OFF;

      emit DisputeFinalized(msg.sender, newAppState);
    } else {
      state.status = Status.DISPUTE;
      state.finalizesAt = block.number + defaultTimeout;

      emit DisputeProgressed(
        msg.sender,
        appState,
        action,
        newAppState,
        state.disputeNonce,
        block.number + defaultTimeout
      );
    }
  }

  /// @notice Unanimously agree to cancel a dispute
  /// @param signatures Signatures by all signing keys of the currently latest disputed
  /// state; an indication of agreement of this state and valid to cancel a dispute
  /// @dev Note this function is only callable when the state channel is in a DISPUTE state
  function cancelDispute(bytes signatures)
    public
    onlyWhenChannelDispute
  {
    bytes32 stateHash = computeStateHash(
      state.appStateHash,
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

  /// @notice Fetch and store the resolution of a state channel application
  /// @param app An `App` struct including all information relevant to interface with an app
  /// @param finalState The ABI encoded version of the finalized application state
  /// @param terms The ABI encoded version of the already agreed upon terms
  /// @dev Note this function is only callable when the state channel is in an OFF state
  function setResolution(App app, bytes finalState, bytes terms)
    public
    onlyWhenChannelClosed
  {
    require(
      keccak256(finalState) == state.appStateHash,
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

    resolution = getAppResolution(app, finalState, terms);
  }

  /// @notice A helper method to check if the state of the channel is final by
  /// doing a check on the submitted state and comparing to the current block number
  /// @param s A state wrapper struct including the status and finalization time
  /// @return A boolean indicating if the state is final or not
  function isStateTerminal(State s) public view returns (bool) {
    if (s.status == Status.ON) {
      return false;
    } else if (s.status == Status.DISPUTE) {
      return block.number >= s.finalizesAt;
    } else if (s.status == Status.OFF) {
      return true;
    }
  }

  /// @notice Compute a unique hash for a state of this state channel and application
  /// @param stateHash The hash of a state to be signed
  /// @param nonce The nonce corresponding to the version of the state
  /// @param timeout A dynamic timeout value representing the timeout for this state
  /// @return A bytes32 hash of the arguments encoded with the signing keys for the channel
  function computeStateHash(bytes32 stateHash, uint256 nonce, uint256 timeout)
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

  /// @notice Compute a unique hash for an action used in this channel application
  /// @param turnTaker The address of the user taking the action
  /// @param previousState The hash of a state this action is being taken on
  /// @param action The ABI encoded version of the action being taken
  /// @param setStateNonce The nonce of the state this action is being taken on
  /// @param disputeNonce A nonce corresponding to how many actions have been taken on the
  /// state since a new state has been unanimously agreed upon by all signing keys.
  /// @return A bytes32 hash of the arguments
  function computeActionHash(
    address turnTaker,
    bytes32 previousState,
    bytes action,
    uint256 setStateNonce,
    uint256 disputeNonce
  )
    internal
    pure
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

  /// @notice A helper method to check if the state of an application is terminal or not
  /// @param app An `App` struct including all information relevant to interface with an app
  /// @param appState The ABI encoded version of some application state
  /// @return A boolean indicating if the application state is terminal or not
  function isAppStateTerminal(App app, bytes appState)
    private
    view
    returns (bool)
  {
    return app.addr.staticcall_as_bool(
      abi.encodePacked(app.isStateTerminal, appState)
    );
  }

  /// @notice A helper method to get the turn taker for an app
  /// @param app An `App` struct including all information relevant to interface with an app
  /// @param appState The ABI encoded version of some application state
  /// @return An address representing the turn taker in the `signingKeys`
  function getAppTurnTaker(App app, bytes appState)
    private
    view
    returns (address)
  {
    uint256 idx = app.addr.staticcall_as_uint256(
      abi.encodePacked(app.getTurnTaker, appState)
    );

    require(
      auth.signingKeys[idx] != address(0),
      "Application returned invalid turn taker index"
    );

    return auth.signingKeys[idx];
  }

  /// @notice Execute the application's applyAction function to compute new state
  /// @param app An `App` struct including all information relevant to interface with an app
  /// @param appState The ABI encoded version of some application state
  /// @param action The ABI encoded version of some application action
  /// @return A bytes array of the ABI encoded newly computed application state
  function executeAppApplyAction(App app, bytes appState, bytes action)
    private
    view
    returns (bytes)
  {
    return app.addr.staticcall_as_bytes(
      abi.encodePacked(app.applyAction, appState, action)
    );
  }

  /// @notice Execute the application's resolve function to compute a resolution
  /// @param app An `App` struct including all information relevant to interface with an app
  /// @param appState The ABI encoded version of some application state
  /// @param terms The ABI encoded version of the transfer terms
  /// @return A `Transfer.Transaction` struct with all encoded information of the resolution
  function getAppResolution(App app, bytes appState, bytes terms)
    private
    view
    returns (Transfer.Transaction)
  {
    return app.addr.staticcall_as_TransferDetails(
      abi.encodePacked(app.resolve, appState, terms)
    );
  }

}
