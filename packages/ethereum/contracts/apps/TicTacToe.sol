pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "./CounterfactualApp.sol";


contract TicTacToe is CounterfactualApp {

  /**
   * Application-specific state.
   */

  enum GameState {
    X_TURN,
    O_TURN,
    X_WON,
    O_WON,
    DRAW
  }

  enum SquareType {
    X,
    O,
    EMPTY
  }

  struct AppState {
    uint256 winner;
  }

  AppState public appState;

  function getExternalState() external view returns (bytes) {
    return abi.encode(appState);
  }

  /**
   * Overriding CounterfactualApp signing methods.
   */

  function setAppStateWithSigningKeys(
    AppState _appState,
    uint256 nonce,
    Signature signature
  )
    public
    CFSignedUpdate(
      abi.encode(_appState),
      nonce,
      signature
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

  /**
   * Application-specific API.
   *
   * Only used in interactive dispute resolution case.
   */

  // modifier sameTurn() {
  //     if (appState.turn == GameState.X_TURN) {
  //         require(msg.sender == appState.playerX);
  //     } else if (appState.turn == GameState.O_TURN) {
  //         require(msg.sender == appState.playerO);
  //     }
  //     _;
  // }

  // function flip (GameState turn) internal pure returns (GameState) {
  //     if (turn == GameState.X_TURN) return GameState.O_TURN;
  //     return GameState.X_TURN;
  // }

  // function squareTypeOfTurn(GameState turn) internal pure returns (SquareType) {
  //     if (turn == GameState.X_TURN) return SquareType.X;
  //     return SquareType.O;
  // }

  // function makeMove(uint x, uint y)
  //   public
  //   appInDispute
  //   sameTurn
  // {
  //     require(appState.board[x][y] == SquareType.EMPTY);
  //     appState.turn = flip(appState.turn);
  //     appState.board[x][y] = squareTypeOfTurn(appState.turn);
  // }

  // function declareVictoryRow(uint rowNum) {
  //     return;
  // }

  // function declareVictoryCol(uint rowNum) {
  //     return;
  // }

  // function declareVictoryMainDiag() {
  //     return;
  // }

  // function declareVictoryOffDiag() {
  //     return;
  // }



}
