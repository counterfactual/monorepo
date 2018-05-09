pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";


library IETH {
	struct Transform {
		address[] receivers;
		uint256[] amounts;
	}
}


contract Callback {
	using IETH for IETH.Transform;
	function receiveUpdate(IETH.Transform) public returns (bool);
}


contract ETHTicTacToeInterpreter is Counterfactual {

	using IETH for IETH.Transform;

	enum SquareType {
		X,
		O,
		EMPTY
	}

	enum StateType {
		X_TURN,
		O_TURN,
		X_WON,
		O_WON
	}

	struct State {
		StateType stateType;
		SquareType[9] board;
	}

	uint256 _amount;

	address[] _players;

	bytes32 _callback;

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function setState(
		uint256 amount,
		address[] players,
		bytes32 callback
	)
		safeUpdate(1)
		public
	{
		_amount = amount;
		_players = players;
		_callback = callback;
	}

	function interpret(State state)
		public
		returns (IETH.Transform)
	{
		IETH.Transform memory T;

		uint256[] memory amounts = new uint256[](_players.length);

		if (state.stateType == StateType.X_WON) {
			amounts[0] = _amount;
			amounts[1] = 0;
			T = IETH.Transform(_players, amounts);
		} else if (state.stateType == StateType.O_WON) {
			amounts[0] = 0;
			amounts[1] = _amount;
			T = IETH.Transform(_players, amounts);
		}

		IRegistry registry = IRegistry(getRegistry());
		Callback callback = Callback(registry.resolve(_callback));
		require(callback.receiveUpdate(T));
	}

}
