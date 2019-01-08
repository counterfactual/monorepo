import React, { Component } from 'react';
import Square from './Square';
import { ReactComponent as StrikeThrough } from '../assets/images/strike-through.svg';

class Board extends Component {
  componentDidMount() {
    this.board = [[], [], []]
    this.appInstance.on("updateState", this.updateBoard.bind(this));
    this.initializeBoard();
  }

  async initializeBoard() {
    const state = await this.appInstance.getState();
    this.updateBoard(state);
  }

  updateBoard(state) {
    this.setState({
      board: state.board
    })
  }

  renderSquare(mark) {
    return <Square mark={mark}/>;
  }

  render() {

    return (
      <div className="board">
        {this.board.map((row) =>
          <div className="board-row">
            {row.map((square) =>
              {this.renderSquare(square)}
            )}
          </div>
        )}
        
  
        {/* <StrikeThrough className="strike-through left-verticle"/> */}
        {/* <StrikeThrough className="strike-through mid-verticle"/>
        <StrikeThrough className="strike-through right-verticle"/>

        <StrikeThrough className="strike-through top-horizontal"/>
        <StrikeThrough className="strike-through mid-horizontal"/>
        <StrikeThrough className="strike-through bottom-horizontal"/>


        <StrikeThrough className="strike-through left-diagonal"/>
        <StrikeThrough className="strike-through right-diagonal"/>

        <div className="winning-game"></div> */}
      </div>
    );
  }
}

export default Board;