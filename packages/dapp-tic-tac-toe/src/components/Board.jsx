import React, { Component } from 'react';
import Square from './Square';
import { ReactComponent as StrikeThrough } from '../assets/images/strike-through.svg';
import { checkVictory } from '../utils/check-end-conditions';

class Board extends Component {
  render() {
    const youWon = checkVictory(this.props.board, this.props.myNumber);
    const theyWon = checkVictory(this.props.board, this.props.opponentNumber);
    const winClaim = youWon || theyWon;
  
    return (
      <div className="board">
        {this.props.board.map((row, x) =>
          <div className="board-row" key={x}>
            {row.map((mark, y) =>
              <Square mark={mark} disabled={!this.props.isMyTurn} key={`${x}-${y}`} x={x} y={y} onTakeAction={this.props.onTakeAction}/>
            )}
          </div>
        )}

        {
          winClaim ?
            <StrikeThrough className={`strike-through dir-${winClaim.winClaimType}-${winClaim.idx}`} />
            : undefined
        }

        { youWon ? <div className="coins"></div> : undefined }
      </div>
    );
  }
}

export default Board;