import React, { Component } from "react";
import { ReactComponent as Logo } from "./assets/images/logo.svg";
import { Link } from "react-router-dom";

class Wager extends Component {
  // This should have a model hook to /api/matchmake.
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      user: {},
      opponent: {},
      intermediary: null
    };
  }

  componentDidMount() {
    // TODO: This token should be obtained from LocalStorage.
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ5OGRhZTNmLWNmYjctNGNmNC05OTZiLWZiNDI5NDI3ZGQ4NSIsInVzZXJuYW1lIjoiam9lbCIsImVtYWlsIjoiZXN0dWRpb0Bqb2VsYWxlamFuZHJvLmNvbSIsImFkZHJlc3MiOiIweDBmNjkzY2M5NTZkZjU5ZGVjMjRiYjFjNjA1YWM5NGNhZGNlNjAxNGQiLCJtdWx0aXNpZ0FkZHJlc3MiOiIweDE0NTczMjUzMTkxRDJDMjUxQTg1Y0JBMTQ1NjY0RWUwYUViNDA4NjgiLCJpYXQiOjE1NDcwODU4MTcsImV4cCI6MTU3ODY0MzQxN30.AQ-ataiWl9emPRWtHVinEXYgyHHZquP9DOXLjmcTKJI";

    fetch(
      "https://server.playground-staging.counterfactual.com/api/matchmake",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
      .then(res => res.json())
      .then(
        result => {
          this.setState({
            isLoaded: true,
            user: result.data.user,
            opponent: result.data.opponent,
            intermediary: result.data.intermediary,
            error: result.error
          });
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        error => {
          this.setState({
            isLoaded: true,
            error
          });
        }
      );
  }

  render() {
    // PLAY! is not a link, it's a button. It'll call proposeInstallVirtual.
    const { error, isLoaded, user } = this.state;

    if (error) {
      return (
        <div className="wager">
          <div className="message">
            <Logo />
            <h1 className="message__title">Oops! :/</h1>
            <p className="message__body">Something went wrong:</p>
            <textarea defaultValue={JSON.stringify(error)} />
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="wager">
          <div className="message">
            <Logo />
            <h1 className="message__title">Getting ready...</h1>
            <p className="message__body">Just a couple of seconds!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="wager">
        <div className="message">
          <Logo />
          <h1 className="message__title">Welcome!</h1>
          <p className="message__body">Ready to play?</p>
        </div>

        <form className="form">
          <input
            className="form__input"
            type="text"
            placeholder="Your name"
            disabled={true}
            value={user.username}
          />
          <input
            className="form__input"
            type="text"
            placeholder="3 eth"
            disabled={true}
            value={this.props.gameInfo.betAmount}
          />
          <Link to="/waiting" className="form__button">
            PLAY!
          </Link>
        </form>
      </div>
    );
  }
}

export default Wager;
