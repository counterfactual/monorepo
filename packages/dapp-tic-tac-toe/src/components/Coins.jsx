import React, { Component } from 'react';
import Coin from './Coin';

class Coins extends Component {
  render() {
    const length = Math.min(
      50,
      Math.max(20, (window.screen.width * window.screen.height) / 10000)
    );

    return (
      <div className="coins">
        {Array.from({ length }).map((val, index) => (
          <div className="coins__coin" key={index}>
            <Coin
              delay={Math.random() * 3}
              speed={1.5 + Math.random() * 1}
              x={-20 + Math.random() * 120}
            />
          </div>
        ))}
      </div>
    );
  }
}

export default Coins;
