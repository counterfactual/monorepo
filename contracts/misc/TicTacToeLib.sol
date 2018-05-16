pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";


library TicTacToeLib {

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

}