import React, { Component } from 'react';
// import Timer from './components/Timer';
import Board from './components/Board';
import Player from './components/Player';
import { Link } from "react-router-dom";
import { checkDraw, checkVictory } from './utils/check-end-conditions';

class Game extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gameState: {
        board: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ]
      }
    };
  }
  
  componentDidMount() {
    this.initializeBoard();
  }

  async initializeBoard() {
    await this.getAppInstance();

    this.props.appInstance.on("updateState", this.onUpdateState.bind(this));
    const state = await this.props.appInstance.getState();
    this.updateGame(state);
  }

  onUpdateState({ data: { newState }}) {
    this.updateGame(newState);
  }

  updateGame(gameState) {
    this.setState({
      gameState
    });
  }

  async getAppInstance() {
    const params = new URLSearchParams(window.location.search);
    const appInstanceId = params.get("appInstanceId");
    const appInstance = await this.props.cfProvider.getOrCreateAppInstance(appInstanceId);
    this.props.onChangeAppInstance(appInstance);
  }

  takeAction(playX, playY) {
    const boardCopy = JSON.parse(JSON.stringify(this.state.gameState.board));
    boardCopy[playX][playY] = this.myNumber;

    const winClaim = checkVictory(boardCopy, this.myNumber);
    const draw = checkDraw(boardCopy);

    this.props.appInstance.takeAction({
      actionType: winClaim ? 1 : draw ? 2 : 0,
      winClaim: winClaim || {},
      playX,
      playY
    });
  }

  // TODO: handle timeout
  timeout() {
    console.log("timeout!")
  }

  // TODO: determine user's number from app state
  get myNumber() {
    return 1;
  }

  // TODO: determine opponent's number from app state
  get opponentNumber() {
    return 2;
  }

  get isMyTurn() {
    return this.state.gameState.turnNum % 2 === (this.myNumber === 1 ? 0 : 1);
  }

  render() {
    return (
      <div className="game">
        <Player
          gameState={this.state.gameState}
          gameInfo={this.props.gameInfo}
          isMyTurn={this.isMyTurn}
          myNumber={this.myNumber}
          opponentNumber={this.opponentNumber}
        />

        {/* <Timer
          isMyTurn={this.isMyTurn}
          onTimeout={this.timeout.bind(this)}
        /> */}
        
        <Board
          board={this.state.gameState.board}
          isMyTurn={this.isMyTurn}
          onTakeAction={this.takeAction.bind(this)}
        />

        { this.state.gameState.winner ?
          <Link to="/wager" className="btn">PLAY AGAIN!</Link> :
          undefined
        }
      </div>
    );
  }
}

export default Game;