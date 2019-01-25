import React, { Component } from "react";

class Square extends Component {
  handleClick() {
    this.props.onTakeAction(this.props.x, this.props.y);
  }

  get src() {
    switch (this.mark) {
      case 1:
        return "/images/x.svg";
      case 2:
        return "/images/o.svg";
      default:
        return false;
    }
  }

  get alt() {
    switch (this.mark) {
      case 1:
        return "X";
      case 2:
        return "O";
      default:
        return false;
    }
  }

  get mark() {
    return window.ethers.utils.bigNumberify(this.props.mark).toNumber();
  }

  get disabled() {
    return "disabled" in this.props ? this.props.disabled : this.mark !== 0;
  }

  render() {
    return (
      <button
        className="square"
        disabled={this.disabled}
        onClick={this.handleClick.bind(this)}
      >
        {this.src ? <img src={this.src} alt={this.alt} /> : undefined}
      </button>
    );
  }
}

export default Square;
