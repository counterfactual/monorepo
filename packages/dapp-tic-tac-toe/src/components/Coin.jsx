import React, { Component } from 'react';

const coinSets = [
  ["02", "11", "12", "06"],
  ["10", "07", "04", "07"],
  ["03", "09", "08", "02"]
];

class Coin extends Component {
  constructor() {
    super();

    this.animating = true;
    this.set = Math.floor(Math.random() * 3);
    this.index = Math.floor(Math.random() * coinSets[this.set].length);
    this.state = {
      image: "01"
    };
  }

  componentDidMount() {
    console.log("componentDidMount")
    this.switchImage();
  }

  componentWillUnmount() {
    this.animating = false;
  }

  async switchImage(): Promise<void> {
    await new Promise(resolve =>
      setTimeout(resolve, 100 + Math.floor(Math.random() * 150))
    );

    this.index += 1;
    if (this.index >= coinSets[this.set].length) this.index = 0;
    
    this.setState({
      image: coinSets[this.set][this.index]
    });

    if (this.animating) this.switchImage();
  }

  render() {
    return (
      <img
        alt=""
        className="coin"
        src={`/images/coins/${this.state.image}.png`}
        style={{
          left: `${this.props.x}%`,
          animationDelay: `${this.props.delay}s`,
          animationDuration: `${this.props.speed}s`
        }}
      />
    );
  }
}

export default Coin;
