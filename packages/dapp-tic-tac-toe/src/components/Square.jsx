import React, { Component } from 'react';

class Square extends Component {
  handleClick() {
    this.props.onTakeAction(this.props.x, this.props.y);
  }

  get src() {
    switch (this.props.mark) {
      case 1: return "/images/x.svg";
      case 2: return "/images/o.svg";
      default: return;
    }
  }

  get disabled() {
    return this.props.disabled || this.props.mark !== 0;
  }

  render() {
    return (
      <button className="square" disabled={this.disabled} onClick={this.handleClick.bind(this)}>
        {this.src ? <img src={this.src} /> : undefined}
      </button>
    );
  }
}

export default Square;