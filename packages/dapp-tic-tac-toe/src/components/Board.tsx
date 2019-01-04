import React, { Component } from "react";

import { ReactComponent as StrikeThrough } from "../assets/images/strike-through.svg";

import Square from "./Square";
class Board extends Component<{}, {}> {
  renderSquare(i) {
    return <Square />;
  }
  render() {
    return (
      <div className="board">
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>

        <StrikeThrough className="strike-through mid-verticle" />
        <StrikeThrough className="strike-through right-verticle" />

        <StrikeThrough className="strike-through top-horizontal" />
        <StrikeThrough className="strike-through mid-horizontal" />
        <StrikeThrough className="strike-through bottom-horizontal" />

        <StrikeThrough className="strike-through left-diagonal" />
        <StrikeThrough className="strike-through right-diagonal" />

        <div className="winning-game" />
      </div>
    );
  }
}
export default Board;
