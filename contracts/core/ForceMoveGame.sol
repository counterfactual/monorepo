pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";
import "../lib/BytesLib.sol";


/// ForceMoveGame.sol is based on a research paper written by Tom Close with support
/// from the L4 Research team. Adapted here to work within the Counterfactual framework.
contract ForceMoveGame is Counterfactual {

	using BytesLib for bytes;

	struct Signature {
		uint8 v;
		bytes32 r;
		bytes32 s;
	}

	struct Channel {
		address gameType;
		address[] participants;
	}

	struct State {
		Channel channel;
		uint256 turnNum;
		bytes gameState;
		bytes resolutionTransform;
	}

	struct Move {
		State state;
		Signature signature;
	}

	struct Challenge {
		bool exists;
		State challengeState;
		bytes resolutionTransform;
	}

	struct Callback {
		bytes32 cfaddr;
		bytes sighash;
	}

	// _gameType is a reference to a particular game being played that adheres
	//		   to the ForceMoveGame interface.
	address _gameType;

	// _validTransitionSighash is the signature of the validTransition(...) function
	//						 from the ABI of the contract at `_gameType`
	bytes _validTransitionSighash;

	// _isFinalSighash is the signature of the isFinal(...) function
	//				 from the ABI of the contract at `_gameType`
	bytes _isFinalSighash;

	// _callbacks is an array of Callback structs (bytes32 cfaddr and bytes sighash)
	//			for which Registry.resolve(cfaddr).call(sighash + ...) will be called
	//			upon the ForceMoveGame being considered "over"
	mapping(uint256 => Callback) _callbacks;
	uint256 _numCallbacks;

	// challenge is a single Challenge representing the currently forced move of the game
	Challenge public challenge;

	modifier onlyWhenChallengeInactive() {
		require(!challenge.exists);
		_;
	}

	modifier onlyWhenChallengeActive() {
		require(challenge.exists);
		_;
	}

	modifier cancelChallenge() {
		_;
		challenge.exists = false;
		delete challenge.resolutionTransform;
		delete challenge.challengeState;
	}

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function mover(State state) internal pure returns (address) {
		uint256 n = state.channel.participants.length;
		return state.channel.participants[state.turnNum % n];
	}

	function isValidTransition(State s1, State s2) internal pure returns (bool) {
		require(channelId(s1.channel) == channelId(s2.channel));
		require(s2.turnNum == 1 + s1.turnNum);
		return true;
	}

	// TODO Explore if this could just return cfaddress
	function channelId(Channel channel) internal pure returns (bytes32) {
		return keccak256(
			channel.gameType,
			channel.participants
		);
	}

	function signer(Move move) internal pure returns (address) {
		return ecrecover(
			keccak256(
				byte(0x19),
				move.state.gameState,
				move.state.turnNum,
				keccak256(
					move.state.channel.gameType,
					move.state.channel.participants
				)
			),
			move.signature.v,
			move.signature.r,
			move.signature.s
		);
	}

	function correctPersonSigned(Move move) internal pure returns (bool) {
		return signer(move) == mover(move.state);
	}

	function resolve() onlyWhenFinal public {
		IRegistry registry = IRegistry(getRegistry());
		for (uint256 i = 0; i < _numCallbacks; i++) {
			bytes memory x = _callbacks[i].sighash;
			bytes memory z = x.concat(challenge.challengeState.gameState);
			bool ret = registry.resolve(_callbacks[i].cfaddr).call(z);
			require(ret == true);
		}
	}

	function setState(
		address gameType,
		bytes validTransitionSighash,
		bytes isFinalSighash,
		Callback[] callbacks
	)
		public
		safeUpdate(1) // tmp 1
	{
		_gameType = gameType;
		_validTransitionSighash = validTransitionSighash;
		_isFinalSighash = isFinalSighash;
		_numCallbacks = callbacks.length;
		for (uint256 i = 0; i < callbacks.length; i++) {
			_callbacks[i] = callbacks[i];
		}
	}

	// https://github.com/ethereum/solidity/issues/434
	function forceMove (Move[] moves)
		public
		onlyWhenChallengeInactive
	{
		require(moves.length > 1);
		require(correctPersonSigned(moves[0]));
		for (uint256 i = 1; i < moves.length; i++) {
			Move memory m1 = moves[i - 1];
			Move memory m2 = moves[i];
			require(correctPersonSigned(m2));
			require(channelId(m1.state.channel) == channelId(m2.state.channel));
			require(isValidTransition(m1.state, m2.state));
			bytes memory x = m1.state.gameState.concat(m2.state.gameState);
			bytes memory y = _validTransitionSighash;
			bytes memory z = y.concat(x);
			bool ret = _gameType.call(z);
			require(ret == true);
		}

		challenge.exists = true;
		challenge.challengeState = moves[moves.length - 1].state;
	}

	function refute(Move refutationMove)
		public
		onlyWhenChallengeActive
		cancelChallenge
	{
		require(channelId(refutationMove.state.channel) == channelId(challenge.challengeState.channel));
		require(mover(refutationMove.state) == mover(challenge.challengeState));
		require(correctPersonSigned(refutationMove));
	}

	function respondWithMove(Move responseMove)
		public
		onlyWhenChallengeActive
		cancelChallenge
	{
		require(channelId(responseMove.state.channel) == channelId(challenge.challengeState.channel));
		require(correctPersonSigned(responseMove));
		require(isValidTransition(challenge.challengeState, responseMove.state));
		bytes memory x = challenge.challengeState.gameState.concat(responseMove.state.gameState);
		bytes memory y = _validTransitionSighash;
		bytes memory z = y.concat(x);
		bool ret = _gameType.call(z);
		require(ret == true);
	}

	function alternativeRespondWithMove(Move[] moves)
		public
		onlyWhenChallengeActive
		cancelChallenge
	{
		require(moves.length > 1);
		require(correctPersonSigned(moves[0]));
		for (uint256 i = 1; i < moves.length; i++) {
			Move memory m1 = moves[i - 1];
			Move memory m2 = moves[i];
			require(correctPersonSigned(m2));
			require(channelId(m1.state.channel) == channelId(m2.state.channel));
			require(isValidTransition(m1.state, m2.state));
			bytes memory x = m1.state.gameState.concat(m2.state.gameState);
			bytes memory y = _validTransitionSighash;
			bytes memory z = y.concat(x);
			bool ret = _gameType.call(z);
			require(ret == true);
		}

		State memory lastState = moves[moves.length - 2].state;
		require(lastState.turnNum == challenge.challengeState.turnNum);
		require(channelId(lastState.channel) == channelId(challenge.challengeState.channel));
	}

	function conclude(Move[] moves) onlyWhenFinal onlyWhenChallengeInactive public {

		require(moves.length > 1);
		require(correctPersonSigned(moves[0]));

		// the first move’s state is a conclusion state i.e. moves[0].state ∈ Sconclude
		bytes memory ifsh = _isFinalSighash;
		bytes memory gs = ifsh.concat(moves[0].state.gameState);
		require(_gameType.call(gs));

		// moves is a sequence of n valid moves, where n is the number of participants
		for (uint256 i = 1; i < moves.length; i++) {
			Move memory m1 = moves[i - 1];
			Move memory m2 = moves[i];
			require(correctPersonSigned(m2));
			require(channelId(m1.state.channel) == channelId(m2.state.channel));
			require(isValidTransition(m1.state, m2.state));
			bytes memory x = m1.state.gameState.concat(m2.state.gameState);
			bytes memory y = _validTransitionSighash;
			bytes memory z = y.concat(x);
			bool ret = _gameType.call(z);
			require(ret == true);
		}

		challenge.challengeState = moves[0].state;

		// NOTE
		//
		// This is pretty dangerous, and ideally we shouldn't modify this variable
		// within a Counterfactual object, but it seems to make sense here.
		objectStorage.wasDeclaredFinal = true;

	}


}
