import React, { Component } from "react";
// import Timer from './components/Timer';
import Board from "./components/Board";
import Coins from "./components/Coins";
import Player from "./components/Player";
import { Link } from "react-router-dom";
import { checkDraw, checkVictory } from "./utils/check-end-conditions";

class Game extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gameState: {
        players: [],
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        winner: 0
      },
      pendingActionResponse: false,
      my0thKeyAddress: window.ethers.utils.HDNode.fromExtendedKey(
        props.user.nodeAddress
      ).derivePath("0").address
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

  async onUpdateState({
    data: {
      newState: { players, turnNum, winner, board }
    }
  }) {
    this.updateGame({ players, turnNum, winner, board });

    if (
      window.ethers.utils.bigNumberify(this.myNumber).eq(winner) ||
      window.ethers.utils.bigNumberify(this.opponentNumber).eq(winner)
    ) {
      try {
        console.log("game over - uninstalling");
        await this.props.appInstance.uninstall(this.props.intermediary);
      } catch (e) {
        console.log("uninstall failed: ", e);
      }
    }
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
    this.setState({ pendingActionResponse: true });

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

    this.setState({ gameState: response, pendingActionResponse: false });
  }

  // TODO: handle timeout
  timeout() {
    console.log("timeout!");
  }

  get myNumber() {
    const index = this.state.gameState.players.indexOf(
      window.ethers.utils.getAddress(this.state.my0thKeyAddress)
    );

    return index === -1 ? index : index + 1;
  }

  get opponentNumber() {
    return this.myNumber === 1 ? 2 : 1;
  }

  get turnNumber() {
    return window.ethers.utils
      .bigNumberify(this.state.gameState.turnNum || { _hex: "0x00" })
      .toNumber();
  }

  get isMyTurn() {
    return this.turnNumber % 2 === (this.myNumber === 1 ? 0 : 1);
  }

  render() {
    const youWon = checkVictory(this.state.gameState.board, this.myNumber);

    return (
      <div>
        <div className="game horizontal-constraint">
          <Player
            winner={this.state.gameState.winner}
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
            disabled={this.state.pendingActionResponse}
            board={this.state.gameState.board}
            isMyTurn={this.isMyTurn}
            myNumber={this.myNumber}
            opponentNumber={this.opponentNumber}
            onTakeAction={this.takeAction.bind(this)}
          />

          {window.ethers.utils.bigNumberify(this.state.gameState.winner).toNumber() ? (
            <Link to="/wager" className="btn">
              PLAY AGAIN!
            </Link>
          ) : (
            undefined
          )}
        </div>

        {youWon ? <Coins /> : undefined}
      </div>
    );
  }
}

export default Game;
