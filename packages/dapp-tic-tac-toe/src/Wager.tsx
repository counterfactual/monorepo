import React, { Component } from "react";
import { Link } from "react-router-dom";

import { ReactComponent as Logo } from "./assets/images/logo.svg";
class Wager extends Component<{}, {}> {
  render() {
    return (
      <div className="wager">
        <div className="message">
          <Logo />
          <h1 className="message__title">Lorem ipsum dolor</h1>
          <p className="message__body">
            Phasellus nec sem id felis rutrum iaculis non non lorem.
          </p>
        </div>

        <form className="form">
          <input className="form__input" type="text" placeholder="Your name" />
          <input className="form__input" type="text" placeholder="3 eth" />
          <Link to="/game" className="form__button">
            PLAY!
          </Link>
        </form>
      </div>
    );
  }
}
export default Wager;
