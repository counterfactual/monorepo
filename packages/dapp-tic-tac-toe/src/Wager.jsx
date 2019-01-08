import React, { Component } from 'react';
import { ReactComponent as Logo } from './assets/images/logo.svg';
import { Link } from "react-router-dom";

class Wager extends Component {
  render() {
    return (
      <div className="wager">
        <div className="message">
          <Logo />
          <h1 className="message__title">Lorem ipsum dolor</h1>
          <p className="message__body">Phasellus nec sem id felis rutrum iaculis non non lorem.</p>
        </div>
  
        <form className="form">
          <input className="form__input" type="text" placeholder="Your name" disabled={true} value={this.props.state.myName} />
          <input className="form__input" type="text" placeholder="3 eth" disabled={true} value={this.props.state.betAmount}  />
          <Link to="/waiting" className="form__button">PLAY!</Link>
        </form>  
      </div>
    );
  }
}

export default Wager;
