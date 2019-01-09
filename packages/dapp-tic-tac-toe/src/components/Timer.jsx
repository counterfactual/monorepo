import React, { Component } from 'react';

class Timer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      secs: 10
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.isMyTurn === false && prevProps.isMyTurn === true) {
      this.stopTick();
    } else if (this.props.isMyTurn === true && prevProps.isMyTurn === false) {
      this.setState({
        secs: 10
      })
      this.tick();
    }
  }

  componentWillUnmount() {
    this.stopTick();
  }

  stopTick() {
    clearTimeout(this.nextTick);
  }

  tick() {
    this.nextTick = setTimeout(() => {
      const secs = this.state.secs - 1;
      this.setState({
        secs
      });

      if (secs > 0) {
        this.tick();
      } else {
        this.props.onTimeout();
      }
    }, 1000);
  }

  get time() {
    if (this.props.isMyTurn) {
      return `00:${this.state.secs < 10 ? "0" + this.state.secs : this.state.secs}`
    } else {
      return "--:--";
    }
  }

  render() {
    return (
      <div className="timer">
        <span>{this.time}</span>
      </div>
    )
  }
}

export default Timer;