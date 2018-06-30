pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "./CounterfactualApp.sol";
import "../modules/TwoPlayerGameModule.sol";


contract TicTacToe is CounterfactualApp {

  enum Player {
    X,
    O
  }

  enum OptionalPlayer {
    X,
    O,
    NONE
  }

  struct AppState {
    address pXAddr;
    address pOAddr;
    OptionalPlayer gameState; // NONE => game im progress
    TwoPlayerGameModule.Result winner;
    OptionalPlayer[3][3] board; // NONE => empty square
  }

  AppState public appState;

  modifier correctTurn() {
    if (appState.gameState == OptionalPlayer.X) {
      require(msg.sender == appState.pXAddr);
    } else if (appState.gameState == OptionalPlayer.O) {
      require(msg.sender == appState.pOAddr);
    }
    _;
  }

  function getGameResult() external view returns (bytes) {
    require(appState.gameState == OptionalPlayer.NONE);
    return abi.encode(appState.winner);
  }

  function getExternalState() external view returns (bytes) {
    return abi.encode(appState);
  }

  function setAppStateWithSigningKeys(
    AppState _appState,
    uint256 nonce,
    bytes signatures
  )
    public
    CFSignedUpdate(
      abi.encode(_appState),
      nonce,
      signatures
    )
  {
    appState = _appState;
  }

  function setAppStateAsOwner(
    AppState _appState,
    uint256 nonce
  )
    public
    CFOwnedUpdate(nonce)
  {
    appState = _appState;
  }

  function makeMove(uint x, uint y)
    public
    correctTurn
  {
    require(appState.board[x][y] == OptionalPlayer.NONE);
    appState.gameState = flipOptional(appState.gameState);
    appState.board[x][y] = appState.gameState;
  }

  function declareVictoryRow(uint rowNum, Player player) public {
    require(appState.board[rowNum][0] == just(player));
    require(appState.board[rowNum][1] == just(player));
    require(appState.board[rowNum][2] == just(player));
    appState.gameState = just(player);
  }

  function declareVictoryCol(uint colNum, Player player) public {
    require(appState.board[0][colNum] == just(player));
    require(appState.board[1][colNum] == just(player));
    require(appState.board[2][colNum] == just(player));
    appState.gameState = just(player);
  }

  function declareVictoryMainDiag(Player player) public {
    require(appState.board[0][0] == just(player));
    require(appState.board[1][1] == just(player));
    require(appState.board[2][2] == just(player));
    appState.gameState = just(player);
  }

  function declareVictoryOffDiag(Player player) public {
    require(appState.board[2][0] == just(player));
    require(appState.board[1][1] == just(player));
    require(appState.board[0][2] == just(player));
    appState.gameState = just(player);
  }

  function flip (Player p) internal pure returns (Player) {
    if (p == Player.X)
      return Player.O;
    if (p == Player.O)
      return Player.X;
  }

  function flipOptional (OptionalPlayer p) internal pure returns (OptionalPlayer) {
    if (p == OptionalPlayer.X)
      return OptionalPlayer.O;
    if (p == OptionalPlayer.O)
      return OptionalPlayer.X;
    return OptionalPlayer.NONE;
  }

  function just (Player p) internal pure returns (OptionalPlayer) {
    if (p == Player.X)
      return OptionalPlayer.O;
    if (p == Player.O)
      return OptionalPlayer.X;
    require(false);
  }

}
