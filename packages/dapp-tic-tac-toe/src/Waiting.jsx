import React, { Component } from "react";

export default class Waiting extends Component {
  constructor(props) {
    super(props);

    this.state = {
      seconds: 5
    };
  }

  componentDidMount() {
    this.countDown();
  }

  componentWillUnmount() {
    clearTimeout(this.countdownTimeout);
  }

  countDown() {
    if (this.state.seconds === 0) {
      return;
    }
    this.countdownTimeout = setTimeout(() => {
      this.setState({
        seconds: this.state.seconds - 1
      });
      this.countDown();
    }, 1000);
  }

  render() {
    return (
      <div className="wrapper">
        <div className="waiting">
          <div className="message">
            <h1 className="message__title">Waiting Room</h1>
            <p className="message__body">
              Waiting for another player to join the game in
            </p>
            <p className="countdown">{this.state.seconds}</p>
            <p>
              Player: {this.props.gameInfo.myName} <br />
              Bet Amount: {this.props.gameInfo.betAmount} ETH
            </p>
          </div>
        </div>
      </div>
    );
  }
}
