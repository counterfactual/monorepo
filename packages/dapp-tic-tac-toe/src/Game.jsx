import React, { Component } from "react";
// import Timer from './components/Timer';
import Board from "./components/Board";
import Player from "./components/Player";
import { Link } from "react-router-dom";
import { checkDraw, checkVictory } from "./utils/check-end-conditions";

class Game extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gameState: {
        players: [],
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
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

    console.log(state);
    console.log(this.props.user);
  }

  onUpdateState({ data: { newState } }) {
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
    const appInstance = await this.props.cfProvider.getOrCreateAppInstance(
      appInstanceId
    );
    this.props.onChangeAppInstance(appInstance);
  }

  async takeAction(playX, playY) {
    const boardCopy = JSON.parse(JSON.stringify(this.state.gameState.board));
    boardCopy[playX][playY] = window.ethers.utils.bigNumberify(this.myNumber);

    const winClaim = checkVictory(boardCopy, this.myNumber);
    const draw = checkDraw(boardCopy);

    let actionType = 0;

    if (winClaim) {
      actionType = 1;
    } else if (draw) {
      actionType = 2;
    }

    const response = await this.props.appInstance.takeAction({
      actionType: actionType,
      winClaim: winClaim || { winClaimType: 0, idx: 0 },
      playX,
      playY
    });

    this.setState({ gameState: response });
  }

  // TODO: handle timeout
  timeout() {
    console.log("timeout!");
  }

  // TODO: verify this works, player numbers should be either 1 or 2
  // used in the contract to determine tile state and winning state
  // https://github.com/counterfactual/monorepo/blob/master/packages/apps/contracts/TicTacToeApp.sol#L31
  // https://github.com/counterfactual/monorepo/blob/master/packages/apps/contracts/TicTacToeApp.sol#L37
  get myNumber() {
    const result =
      this.state.gameState.players.indexOf(
        window.ethers.utils.getAddress(this.props.user.ethAddress)
      ) + 1;
    console.log("myNumber", result);
    return result;
  }

  get opponentNumber() {
    const result = this.myNumber === 1 ? 2 : 1;
    console.log("opponentNumber", result);
    return result;
  }

  get turnNumber() {
    return window.ethers.utils
      .bigNumberify(this.state.gameState.turnNum || { _hex: "0x00" })
      .toNumber();
  }

  get isMyTurn() {
    const result = this.turnNumber % 2 === (this.myNumber === 1 ? 0 : 1);
    console.log("isMyTurn", result);
    return result;
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

        {this.state.gameState.winner ? (
          <Link to="/wager" className="btn">
            PLAY AGAIN!
          </Link>
        ) : (
          undefined
        )}
      </div>
    );
  }
}

export default Game;
