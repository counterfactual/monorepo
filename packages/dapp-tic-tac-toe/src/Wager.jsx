import React, { Component } from "react";
import { ReactComponent as Logo } from "./assets/images/logo.svg";

class Wager extends Component {
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

  async componentDidMount() {
    this.props.cfProvider.once("install", this.onInstall.bind(this));

    // TODO: This token should be obtained from LocalStorage.
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ5OGRhZTNmLWNmYjctNGNmNC05OTZiLWZiNDI5NDI3ZGQ4NSIsInVzZXJuYW1lIjoiam9lbCIsImVtYWlsIjoiZXN0dWRpb0Bqb2VsYWxlamFuZHJvLmNvbSIsImFkZHJlc3MiOiIweDBmNjkzY2M5NTZkZjU5ZGVjMjRiYjFjNjA1YWM5NGNhZGNlNjAxNGQiLCJtdWx0aXNpZ0FkZHJlc3MiOiIweDE0NTczMjUzMTkxRDJDMjUxQTg1Y0JBMTQ1NjY0RWUwYUViNDA4NjgiLCJpYXQiOjE1NDcwODU4MTcsImV4cCI6MTU3ODY0MzQxN30.AQ-ataiWl9emPRWtHVinEXYgyHHZquP9DOXLjmcTKJI";

    try {
      const response = await fetch(
        "https://server.playground-staging.counterfactual.com/api/matchmake",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const result = await response.json();

      this.setState({
        isLoaded: true,
        user: result.data.user,
        opponent: result.data.opponent,
        intermediary: result.data.intermediary,
        error: result.error
      });
    } catch (error) {
      this.setState({
        isLoaded: true,
        error
      });
    }
  }

  createAppFactory() {
    return new window.cf.AppFactory(
      // TODO: provide valid appId
      "0x1515151515151515151515151515151515151515",
      {
        actionEncoding:
          "tuple(ActionType actionType, uint256 playX, uint256 playY, WinClaim winClaim)",
        stateEncoding:
          "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)"
      },
      this.props.cfProvider
    );
  }

  /**
   * Bob(Proposing) makes a call to CF.js proposeInstall.
   * Bob(Proposing) waits for Alice(Accepting) to approve -- Add Waiting Room (Waiting for Alice) --
   */
  async proposeInstall(user, opponent, intermediary) {
    const myAddress = user.address;
    const appFactory = this.createAppFactory();

    appFactory.proposeInstallVirtual({
      peerAddress: opponent.address,
      asset: {
        assetType: 0 /* AssetType.ETH */
      },
      peerDeposit: window.ethers.utils.parseEther(
        this.props.gameInfo.betAmount
      ),
      myDeposit: window.ethers.utils.parseEther(this.props.gameInfo.betAmount),
      timeout: 100,
      initialState: {
        address: [myAddress, opponent.address],
        turnNum: 0,
        winner: 0,
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      },
      intermediaries: [intermediary]
    });
  }

  /**
   * Alice(Accepting) receives a notification that Bob(Proposing) has invited them to play High Roller
   * Alice(Accepting) approves the initiation. Playground calls CF.js install
   * Bob(Proposing) moves out of the waiting room and into the game
   */
  async install(intermediary) {
    this.props.cfProvider.installVirtual({
      appInstanceId: this.props.gameInfo.appInstanceId,
      intermediaries: [intermediary]
    });
  }

  onInstall({ data: { appInstance } }) {
    this.props.onChangeAppInstance(appInstance);
    this.props.history.push(`/game?appInstanceId=${appInstance.id}`);
  }

  onPlayClicked() {
    const { user, opponent, intermediary } = this.state;

    if (!this.props.gameInfo.shouldMatchmake) {
      this.proposeInstall(user, opponent, intermediary);
    } else {
      this.install(intermediary);
    }
  }

  render() {
    const { error, isLoaded, user } = this.state;

    if (error) {
      return (
        <div className="wager">
          <div className="message">
            <Logo />
            <h1 className="message__title">Oops! :/</h1>
            <p className="message__body">Something went wrong:</p>
            <textarea
              rows={10}
              cols={60}
              defaultValue={
                error.errorCode
                  ? JSON.stringify(error)
                  : `${error.message}\n${error.stack}`
              }
            />
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
          <button
            type="button"
            onClick={this.onPlayClicked.bind(this)}
            className="form__button"
          >
            PLAY!
          </button>
        </form>
      </div>
    );
  }
}

export default Wager;
