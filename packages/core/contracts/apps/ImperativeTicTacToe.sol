// pragma solidity ^0.4.24;
// pragma experimental "ABIEncoderV2";

// import "@counterfactual/core/contracts/StateChannel.sol";
// import "@counterfactual/core/contracts/lib/TwoPlayerGame.sol";
// import "@counterfactual/core/contracts/lib/Transfer.sol";


// contract ImperativeTicTacToe is StateChannel, TwoPlayerGame {

//   // [0][0] | [1][0] | [2][0]
//   // -------+--------+-------
//   // [0][1] | [1][1] | [2][1]
//   // -------+--------+-------
//   // [0][2] | [1][2] | [2][2]

//   uint[2] public TOP_LEFT      = [0, 0];
//   uint[2] public TOP_CENTER    = [1, 0];
//   uint[2] public TOP_RIGHT     = [2, 0];
//   uint[2] public CENTER_LEFT   = [0, 1];
//   uint[2] public CENTER        = [1, 1];
//   uint[2] public CENTER_RIGHT  = [2, 1];
//   uint[2] public BOTTOM_LEFT   = [0, 2];
//   uint[2] public BOTTOM_CENTER = [1, 2];
//   uint[2] public BOTTOM_RIGHT  = [2, 2];

//   uint[2][3][8] public winConfigurations = [
//     // Verticals
//     [TOP_LEFT, CENTER_LEFT, BOTTOM_LEFT],
//     [TOP_CENTER, CENTER, BOTTOM_CENTER],
//     [TOP_RIGHT, CENTER_RIGHT, BOTTOM_RIGHT],

//     // Horizontals
//     [TOP_LEFT, TOP_CENTER, TOP_RIGHT],
//     [CENTER_LEFT, CENTER, CENTER_RIGHT],
//     [BOTTOM_LEFT, CENTER_RIGHT, BOTTOM_RIGHT],

//     // Top left to bottom right diagonal
//     [TOP_LEFT, CENTER, BOTTOM_RIGHT],

//     // Bottom left to top right diagonal
//     [TOP_RIGHT, CENTER, TOP_RIGHT]
//   ];

//   enum Player {
//     X,
//     O,
//     NONE
//   }

//   struct State {
//     Game game;
//     Player turn;
//     Player[3][3] board;
//   }

//   modifier correctTurn(State state) {
//     if (state.turn == Player.X) {
//       require(msg.sender == state.game.player1);
//     } else if (state.turn == Player.O) {
//       require(msg.sender == state.game.player2);
//     }
//     _;
//   }

//   function makeMove(State state, uint x, uint y)
//     public
//     verifyUnsettledState(abi.encode(state))
//     correctTurn(state)
//   {
//     require(state.board[x][y] == Player.NONE);
//     state.turn = getOtherPlayer(state.turn);
//     state.board[x][y] = state.turn;
//     stateChannel.update(abi.encode(state));
//   }

//   function declareVictory(State state, uint hint)
//     public
//     verifyUnsettledState(abi.encode(state))
//   {
//     Player winner = confirmVictory(state.board, hint);

//     // Set state to indicate winner
//     if (winner == Player.X) state.game.result == Result.P1_WON;
//     else if (winner == Player.O) state.game.result == Result.P2_WON;
//     else revert("Player.NONE cannot win!");

//     // StateChannel function to set resolution
//     stateChannel.close(resolution(state));
//   }

//   function resolution(State state)
//     public
//     view
//     returns (Transfer.Details)
//   {
//     return winnerGetsAll(state.game, stateChannel.terms);
//   }

//   function computeResolution(State state)
//     internal
//     returns (Transfer.Details)
//   {
//     return winnerGetsAll(state.game, stateChannel.terms);
//   }

//   function getOtherPlayer(Player p)
//     internal
//     pure
//     returns (Player)
//   {
//     if (p == Player.X) return Player.O;
//     if (p == Player.O) return Player.X;
//     return Player.NONE;
//   }

//   function confirmVictory(Player[3][3] board, uint hint)
//     internal
//     view
//     returns (Player)
//   {
//     uint[2][3] memory pos = winConfigurations[hint];

//     Player pos1 = board[pos[0][0]][pos[0][1]];
//     Player pos2 = board[pos[1][0]][pos[1][1]];
//     Player pos3 = board[pos[2][0]][pos[2][1]];

//     require(
//       pos1 != Player.NONE && pos1 == pos2 && pos2 == pos3,
//       "Board not in a winning position with provided hint."
//     );

//     return pos1;

//   }

// }
