pragma solidity ^0.4.22;

pragma experimental ABIEncoderV2;

import "./BaseCFObject.sol";
import "../interfaces/IForcedMoveGame.sol";

contract SimpleAdjudicator is BaseCFObject {

    using CFLib for CFLib.ObjectStorage;

    struct CommonState {
        uint256 nonce;
        address[] participants;
        bytes state;
    }

    struct Signatures {
        uint8[] v;
        bytes32[] r;
        bytes32[] s;
    }

    struct Challenge {
        CommonState state;
        uint32 readyAt;
    }

    bytes32 gameAddress;

    Challenge currentChallenge;
    uint challengeDuration = 1 days;

    constructor(bytes32 _gameAddress, CFLib.ObjectStorage _objectStorage) public {
        gameAddress = _gameAddress;
        objectStorage.init(_objectStorage);
    }

    function forceMove(
        CommonState _yourState,
        CommonState _myState,
        Signatures sigs
    ) public {
        // need currentChallenge to be empty
        require(currentChallenge.readyAt == 0);

        // states must be signed by the appropriate participant
        // _yourState.requireSignature(sigs.v[0], sigs.r[0], sigs.s[0]);
        // _myState.requireSignature(sigs.v[1], sigs.r[1], sigs.s[1]);

        // nonce must have incremented
        require(_myState.nonce == _yourState.nonce + 1);

        IRegistry registry = IRegistry(getRegistry());
        IForcedMoveGame fmg = IForcedMoveGame(registry.resolve(gameAddress));

        // must be a valid transition
        require(fmg.validTransition(_yourState.state, _myState.state));

        currentChallenge.state = _myState;
        currentChallenge.readyAt = uint32(now + challengeDuration);

        // figure out the resolution immediately
        // (currentChallenge.resolvedBalances[0], currentChallenge.resolvedBalances[1]) = fmg.resolve(_myState);
    }

    // function respondWithMove(CommonState _nextState, uint8 v, bytes32 r, bytes32 s) public {
    //     // check that there is a current challenge
    //     require(currentChallenge.readyAt != 0);
    //     // and that we're within the timeout
    //     require(currentChallenge.readyAt > now);

    //     // check that the nonce has increased
    //     require(currentChallenge.state.nonce + 1 == _nextState.nonce);

    //     // check that the challengee's signature matches
    //     // _nextState.requireSignature(v, r, s);

    //     // must be valid transition
    //     IForcedMoveGame fmg = IForcedMoveGame(gameAddress);
    //     require(fmg.validTransition(currentChallenge.state.state, _nextState.state));

    //     // Cancel challenge.
    //     // TODO: zero out everything(?)
    //     currentChallenge.readyAt = 0;
    // }

    // function respondWithAlternativeMove(bytes _alternativeState, bytes _nextState, Signatures sigs) public {
    //     // check that there is a current challenge
    //     require(currentChallenge.readyAt != 0);
    //     // and that we're within the timeout
    //     require(currentChallenge.readyAt > now);

    //     require(currentChallenge.state.channelId() == _nextState.channelId());

    //     // checking the alternative state:
    //     // .. it must have the same nonce as the challenge state
    //     require(currentChallenge.state.stateNonce() == _alternativeState.stateNonce());
    //     // .. it must be signed (by the challenger)
    //     _alternativeState.requireSignature(v[0], r[0], s[0]);

    //     // checking the nextState:
    //     // .. the nonce must have increased by 1
    //     require(currentChallenge.state.stateNonce() + 1 == _nextState.stateNonce());
    //     // .. it must be a valid transition of the gamestate (from the alternative state)
    //     require(IForcedMoveGame(_nextState.channelType()).validTransition(_alternativeState, _nextState));
    //     // .. it must be signed (my the challengee)
    //     _nextState.requireSignature(v[1], r[1], s[1]);

    //     // Cancel challenge.
    //     // TODO: zero out everything(?)
    //     currentChallenge.readyAt = 0;
    // }

    // function refuteChallenge(bytes _refutationState, uint8 v, bytes32 r, bytes32 s) {
    //     // check that there is a current challenge
    //     require(currentChallenge.readyAt != 0);
    //     // and that we're within the timeout
    //     require(currentChallenge.readyAt > now);

    //     require(currentChallenge.state.channelId() == _refutationState.channelId());

    //     // the refutationState must have a higher nonce
    //     require(_refutationState.stateNonce() > currentChallenge.state.stateNonce());
    //     // ... with the same mover
    //     require(_refutationState.mover() == currentChallenge.state.mover());
    //     // ... and be signed (by that mover)
    //     _refutationState.requireSignature(v, r, s);

    //     currentChallenge.readyAt = 0;
    // }

    // Signing util

    function recoverSigner(bytes data, uint8 _v, bytes32 _r, bytes32 _s) internal view returns(address) {
        bytes32 transactionHash = keccak256(byte(0x19), gameAddress, data);
        address a = ecrecover(transactionHash, _v, _r, _s);
        return(a);
    }

}