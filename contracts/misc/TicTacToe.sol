pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "./TicTacToeLib.sol";


contract TicTacToe {

	using TicTacToeLib for TicTacToeLib.StateType;
	using TicTacToeLib for TicTacToeLib.SquareType;
	using TicTacToeLib for TicTacToeLib.State;

	//   TicTacToe finite state machine.
	//
	//	( X_TURN ) <-----> ( O_TURN )
	//		|				   |
	//		v				   v
	//	( X_WON )		   ( O_WON )

	function numPieces(TicTacToeLib.SquareType[9] board) internal pure returns (uint256, uint256) {
		uint256 numX;
		uint256 numO;
		for (uint256 i = 0; i < board.length; i++) {
			if (board[i] == TicTacToeLib.SquareType.X) {
				numX++;
			} else if (board[i] == TicTacToeLib.SquareType.O) {
				numO++;
			}
		}
		return (numX, numO);
	}

	function validTransition(
		TicTacToeLib.State oldState,
		TicTacToeLib.State newState
	)
		public
		pure
		returns (bool)
	{
		uint256 oldX;
		uint256 oldO;
		uint256 newX;
		uint256 newO;

		(oldX, oldO) = numPieces(oldState.board);
		(newX, newO) = numPieces(newState.board);

		if (oldState.stateType == TicTacToeLib.StateType.X_TURN) {
			require(
				newState.stateType == TicTacToeLib.StateType.X_WON ||
				newState.stateType == TicTacToeLib.StateType.O_TURN
			);
			require(newX == 1 + oldX && newO == oldO);
		} else if (oldState.stateType == TicTacToeLib.StateType.O_TURN) {
			require(
				newState.stateType == TicTacToeLib.StateType.O_WON ||
				newState.stateType == TicTacToeLib.StateType.X_TURN
			);
			require(newX == oldX && newO == 1 + oldO);
		} else {
			return false;
		}
	}

	function isFinal(TicTacToeLib.State state) public pure returns (bool) {
		require(
			state.stateType == TicTacToeLib.StateType.X_WON ||
			state.stateType == TicTacToeLib.StateType.O_WON
		);

		uint8[3][8] memory winTypes = [
			[0, 1, 2], // Top-row horizontal victory
			[3, 4, 5], // Middle-row horizontal victory
			[6, 7, 8], // Bottom-row horizontal victory
			[0, 3, 6], // Left-column vertical victory
			[1, 4, 7], // Middle-column vertical victory
			[2, 5, 8], // Right-column vertical victory
			[2, 4, 6], // Forward-diagonal (/) victory
			[0, 4, 8]  // Backward-diagonal (\) victory
		];

		for (uint256 i = 0; i < winTypes.length; i++) {
			if (
				state.board[winTypes[i][0]] == state.board[winTypes[i][1]] &&
				state.board[winTypes[i][1]] == state.board[winTypes[i][2]])
			{
				return true;
			}
		}

		return false;
	}

}
