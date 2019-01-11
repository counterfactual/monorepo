import React, { Component } from "react";
import { ReactComponent as Logo } from "./assets/images/logo.svg";
import Waiting from "./Waiting";

class Wager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      isWaiting: false,
      opponent: {},
      intermediary: null
    };
  }

  async componentDidMount() {
    this.props.cfProvider.once("install", this.onInstall.bind(this));

    const { token } = this.props.user;

    try {
      const response = await fetch("http://localhost:9000/api/matchmake", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();

      this.setState({
        isLoaded: true,
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

  onInstall({ data: { appInstance } }) {
    this.props.onChangeAppInstance(appInstance);
    this.props.history.push(`/game?appInstanceId=${appInstance.id}`);
  }

  onPlayClicked() {
    const { opponent, intermediary } = this.state;
    const { user } = this.props;

    this.setState({ isWaiting: true });

    this.proposeInstall(user, opponent, intermediary);
  }

  render() {
    const { error, isLoaded, isWaiting } = this.state;
    const { user } = this.props;

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

    if (isWaiting) {
      return <Waiting gameInfo={this.props.gameInfo} />;
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
