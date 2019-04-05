pragma solidity ^0.5.5;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/CounterfactualApp.sol";
import "./lib/LibSignature.sol";
import "./lib/LibNIKE.sol";
import "./lib/LibBytesString.sol";


/// @title ChannelizedCoinShufflePlusApp
/// @author Alex Xiong - <alex.xiong.tech@gmail.com>
/// @notice A channelized CoinShuffle++ protocol in Counterfactual framework
contract ChannelizedCoinShufflePlusApp is CounterfactualApp, LibNIKE,
LibSignature, LibBytesString {

  //TODO: add DC-net functions and assistant functions
  enum Round {
    KEY_EXCHANGE, COMMITMENT, DC_NET, CONFIRMATION, REVEAL_KEY, DONE
  }

  enum ActionType {
    SET_NPK, COMMIT_DC_VECTOR, OPEN_COMMITMENT, CONFIRM
  }

  struct Action {
    ActionType actionType;
    PK[] npk;
    bytes[] commitments;
    bytes[] dcMessages;
    address[] recipents;
  }

  struct AppState {
    Round round;
    address[] peers;
    PK[] npk;
    bytes[] commitments;
    bytes[] dcMessages;
    address[] recipents;
  }

  function isStateTerminal(bytes memory encodedState)
    public
    pure
    returns (bool)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    return state.round == Round.DONE;
  }

  function getTurnTaker(bytes memory encodedState, address[] memory signingKeys)
    public
    pure
    returns (address)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    require(state.round != Round.DONE, "Shuffle already finished.");
    // @notice signingKeys is assumed to be lexicographically sorted
    // and the same sequence as AppState.peers
    // TODO: consolidate solution with L4 team
    if (state.round == Round.KEY_EXCHANGE) {
      return signingKeys[state.npk.length - 1];
    } else if (state.round == Round.COMMITMENT) {
      return signingKeys[state.commitments.length - 1];
    } else if (state.round == Round.DC_NET) {
      return signingKeys[state.dcMessages.length - 1];
    } else if (state.round == Round.CONFIRMATION) {
      // FIXME: anyone could submit
      return signingKeys[0];
    }
  }

  // TODO:add action param verification
  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    Action memory action = abi.decode(encodedAction, (Action));

    require(state.peers.length > 0, "participants/peers not set yet.");
    // TODO: extra check that peers are actual channel peers is better.
    // also peers is in the same order of signingKeys of this app.
    uint256 setSize = state.peers.length;

    AppState memory nextState = state;

    if (action.actionType == ActionType.SET_NPK) {
      require(state.round == Round.KEY_EXCHANGE, "Cannot update public keys for when not in KEY_EXCHANGE round.");
      require(action.npk.length > state.npk.length, "Can only append PK to the list");
      for (uint i = state.npk.length; i<action.npk.length; i++) {
        require(validatePK(action.npk[i]), "Invalid Public Key!");
      }

      nextState.npk = action.npk;
      if (action.npk.length == setSize) {
        nextState.round = Round.COMMITMENT;
      }
    } else if (action.actionType == ActionType.COMMIT_DC_VECTOR) {
      require(state.round == Round.COMMITMENT, "Cannot update DC vector commitments when not in COMMITMENT round.");
      require(action.commitments.length > state.commitments.length, "Can only append commitments to the list");
      nextState.commitments = action.commitments;
      if (action.commitments.length == setSize) {
        nextState.round = Round.DC_NET;
      }
    } else if (action.actionType == ActionType.OPEN_COMMITMENT) {
      require(state.round == Round.DC_NET, "Cannot update DC messages when not in DC_NET round.");
      require(action.dcMessages.length > state.dcMessages.length, "Can only append dcMessages to the list");
      nextState.dcMessages = action.dcMessages;
      if (action.dcMessages.length == setSize) {
        nextState.round = Round.CONFIRMATION;
      }
    } else if (action.actionType == ActionType.CONFIRM) {
      require(state.round == Round.CONFIRMATION, "Cannot confirm recipents when not in CONFIRMATION round.");
      nextState.recipents = action.recipents;
      require(action.recipents.length == setSize, "Cannot confirm with fewer recipent addresses than the number of participants");
      nextState.round = Round.DONE;
    } else {
      revert("Invalid action type");
    }
    return abi.encode(nextState);
  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));
    uint256 setSize = state.peers.length;

    uint256[] memory amounts = new uint256[](setSize);
    for (uint i = 0; i<setSize; i++) {
      amounts[i] = terms.limit/setSize;
    }

    address[] memory to = new address[](setSize);
    if (state.round == Round.DONE) {
      to = state.recipents;
    } else {
      to = state.peers;
    }
    // data field placeholder
    bytes[] memory data = new bytes[](setSize);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

  function getEncodedAppState(AppState memory appState)
    public
    pure
    returns (bytes memory)
  {
    return abi.encode(appState);
  }

  function getAppStateHash(AppState memory appState)
    public
    pure
    returns (bytes32)
  {
    return keccak256(getEncodedAppState(appState));
  }

  /// @notice pre-KeyExchange hash commit to session id and run number
  /// @param sid session id for NIKE
  /// @param run number of run for DiceMix
  function getSidPreHash(uint8 sid, uint8 run)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked("sidHpre", sid, run));
  }

  /// @notice construct the message to sign in KeyExchange round
  /// @param pk is the public key from LibNIKE.keyGen
  /// @param sidHpre is the sidPreHash identifier derived
  function getPKMessage(PK memory pk, bytes32 sidHpre)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encode(pk, sidHpre));
  }

  /// @notice helper function for client to verify signed message in KE
  /// utilize LibSignature functions
  /// @param signingKey the (ephemeral) address of the signing party
  function verifySignedPKMessage(
    bytes memory signature,
    uint8 sid,
    uint8 run,
    PK memory pk,
    address signingKey
  )
    public
    pure
    returns (bool)
  {
    if (validatePK(pk)) {
      address[] memory signers;
      signers[0] = signingKey;

      return verifySignatures(
        signature,
        getPKMessage(pk, getSidPreHash(sid, run)),
        signers
      );
    }
    return false;
  }

  /// @notice helper function to construct sidH
  function getSidHash(
    uint sid,
    uint run,
    address[] memory signingKeys,
    PK[] memory pks
  )
    public
    pure
    returns (bytes32)
  {
    // NOTE: strictly following the spec in CoinShuffle++
    return keccak256(abi.encode("sidH", sid, signingKeys, pks, run));
  }

  /// @notice generate shared keys with all other peers
  /// @param signingKeys the ephemeral keys/identities of all peers in this app
  /// @param npks list of public key broadcasted by peers for this run
  /// @param my signingKey of the func caller
  /// @param sk secret key of the func caller
  /// @param sidH a unique identifier of a particular run & session
  function DCKeys(
    address[] memory signingKeys,
    PK[] memory npks,
    address my,
    bytes memory sk,
    bytes32 sidH
  )
    public
    pure
    returns (bytes32[] memory)
  {
    string memory id_2 = addressToString(my);
    bytes32[] memory ret = new bytes32[](signingKeys.length);

    for (uint i = 0; i<signingKeys.length; i++){
      if (signingKeys[i] != my) {
        string memory id_1 = addressToString(signingKeys[i]);
        ret[i] = sharedKeyWithSidH(id_1, npks[i], id_2, sk, sidH);
      }
    }
    return ret;
  }

  /// @notice a helper wrapper around NIKE.sharedKey for DiceMix
  function sharedKeyWithSidH(
    string memory id_1,
    PK memory pk_1,
    string memory id_2,
    bytes memory sk_2,
    bytes32 sidH
  )
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(sharedKey(id_1, pk_1, id_2, sk_2),sidH));
  }
}
