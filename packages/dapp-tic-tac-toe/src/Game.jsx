import React, { Component } from 'react';
import Timer from './components/Timer';
import Board from './components/Board';
import { Link } from "react-router-dom";

class Game extends Component {
  render() {
    return (
      <div className="game">

        <div className="player">

          {/* 
            state: turn, won, lost
            classNames: 'player__status--turn', 'player__status--won', 'player__status--lost
          */}
          <div className="player__status player__status--turn">
            {/* STATE: 'turn' */}
            <span>JOHN'S TURN</span>

            {/* STATE: 'won' */}
            {/* <div className="result">
              <span>YOU WON!</span>
              <span>2 ETH</span>
            </div> */}

            {/* STATE: 'lost' */}
            {/* <div className="result">
              <span>YOU LOST</span>
              <span>2 ETH</span>
            </div> */}
          </div>
        </div>

        <Timer />
        
        <Board appInstance={this.appInstance} />

        <Link to="/wager" className="btn">PLAY AGAIN!</Link>
      </div>
    );
  }
}

export default Game;