pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";
import "./TicTacToeLib.sol";
import "./ETHChannelLib.sol";


contract TicTacToeInterpreter is Counterfactual {

	using ETHChannelLib for ETHChannelLib.Balance;
	using TicTacToeLib for TicTacToeLib.StateType;
	using TicTacToeLib for TicTacToeLib.State;

	uint256 _amount;
	address[] _players;

	constructor(
		uint256 amount,
		address[] players,
		ObjectStorage cfparams
	)
		init(cfparams)
		public
	{
		_amount = amount;
		_players = players;
	}

	function interpret(TicTacToeLib.State state)
		public
		view
		returns (bytes)
	{
		ETHChannelLib.Balance[] memory balances = new ETHChannelLib.Balance[](2);
		uint256[] memory amounts = new uint256[](2);

		if (state.stateType == TicTacToeLib.StateType.X_WON) {
			amounts[0] = _amount;
			amounts[1] = 0;
		} else if (state.stateType == TicTacToeLib.StateType.O_WON) {
			amounts[0] = 0;
			amounts[1] = _amount;
		} else {
			amounts[0] = _amount / 2;
			amounts[1] = _amount / 2;
		}

		balances[0] = ETHChannelLib.Balance(_players[0], amounts[0]);
		balances[1] = ETHChannelLib.Balance(_players[1], amounts[1]);

		return abi.encode(balances);
	}

}