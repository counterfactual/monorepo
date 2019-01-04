import React, { Component } from "react";
import { Link } from "react-router-dom";

import Board from "./components/Board";
import Timer from "./components/Timer";
class Game extends Component<{}, {}> {
  render() {
    return (
      <div className="game">
        <div className="player">
          <div className="player__status player__status--won">
            <div className="result">
              <span>YOU WON!</span>
              <span>2 ETH</span>
            </div>
          </div>
        </div>

        <Timer />

        <Board />

        <Link to="/wager" className="btn">
          PLAY AGAIN!
        </Link>
      </div>
    );
  }
}
export default Game;
