import React, { Component } from 'react';

class Player extends Component {
  get won() {
    return this.props.gameState.winner === this.props.myNumber;
  }

  get lost() {
    return this.props.gameState.winner === this.props.opponentNumber;
  }

  get tied() {
    return this.props.gameState.winner === 3;
  }

  get status() {
    return `player__status player__status--${this.won ? "won" : this.lost ? "lost" : "turn"}`;
  }

  render() {
    return (
      <div className="player">
        <div className={this.status}>
          {this.won ?
            <div className="result">
              <span>YOU WON!</span>
              <span>{this.props.gameInfo.betAmount} ETH</span>
            </div> : this.lost ?
            <div className="result">
              <span>YOU LOST</span>
              <span>{this.props.gameInfo.betAmount} ETH</span>
            </div> : this.tied ?
            <div className="result">
              <span>YOU TIED</span>
            </div> : this.props.isMyTurn ?
            <span>YOUR TURN</span> :
            <span>{this.props.gameInfo.opponentName}'S TURN</span>
          }
        </div>
      </div>
    );
  }
}

export default Player;