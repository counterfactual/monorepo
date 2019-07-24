import KovanContracts from "@counterfactual/apps/networks/42.json";
import RopstenContracts from "@counterfactual/apps/networks/3.json";
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
      intermediary: null,
      appInstance: null
    };
  }

  async componentDidMount() {
    this.props.cfProvider.on("installVirtual", this.onInstall.bind(this));

    try {
      const result = await this.matchmake();

      const opponent = {
        id: "opponent",
        attributes: {
          username: result.data.attributes.username,
          nodeAddress: result.data.attributes.nodeAddress,
          ethAddress: result.data.attributes.ethAddress
        }
      };

      this.setState({
        isLoaded: true,
        opponent: { id: opponent.id, ...opponent.attributes },
        intermediary: result.data.attributes.intermediary,
        error: result.error
      });
    } catch (error) {
      this.setState({
        isLoaded: true,
        error
      });
    }
  }

  async matchmake() {
    return new Promise(resolve => {
      const onMatchmakeResponse = event => {
        if (
          !event.data.toString().startsWith("playground:response:matchmake")
        ) {
          return;
        }

        window.removeEventListener("message", onMatchmakeResponse);

        const [, data] = event.data.split("|");
        resolve(JSON.parse(data));
      };

      window.addEventListener("message", onMatchmakeResponse);

      window.parent.postMessage("playground:request:matchmake", "*");
    });
  }

  createAppFactory() {
    let contractAddress;
    // const networkVersion = window["web3"].currentProvider.networkVersion;
    // FIXME: hard-coding to use Kovan until we fix this
    const networkVersion = "42";
    const contractName = "TicTacToeApp";
    switch (networkVersion) {
      case "3":
        contractAddress = getContractAddress(RopstenContracts, contractName);
        break;
      case "42":
        contractAddress = getContractAddress(KovanContracts, contractName);
        break;
      default:
        throw new Error(
          `The App has not been deployed to network ID ${networkVersion}`
        );
    }
    return new window.cf.AppFactory(
      contractAddress,
      {
        actionEncoding:
          "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)",
        stateEncoding:
          "tuple(uint256 versionNumber, uint256 winner, uint256[3][3] board)"
      },
      this.props.cfProvider
    );
  }

  /**
   * Bob(Proposing) makes a call to CF.js proposeInstall.
   * Bob(Proposing) waits for Alice(Accepting) to approve -- Add Waiting Room (Waiting for Alice) --
   */
  async proposeInstall(user, opponent, intermediary) {
    const appFactory = this.createAppFactory();

    const currentEthBalance = window.ethers.utils.parseEther(
      this.props.balance
    );
    const bet = window.ethers.utils.parseEther(this.props.gameInfo.betAmount);

    if (currentEthBalance.lt(bet)) {
      this.setState({
        error: `Insufficient funds: You need at least ${
          this.props.gameInfo.betAmount
        } ETH to play.`
      });
      return;
    }

    if (
      bet.gt(window.ethers.utils.parseEther("0.01")) ||
      bet.lt(window.ethers.utils.parseEther("0"))
    ) {
      this.setState({ error: `Please, place a bet between 0 and 0.01 ETH.` });
      return;
    }

    this.setState({
      appInstance: await appFactory.proposeInstallVirtual({
        proposedToIdentifier: opponent.nodeAddress,
        responderDeposit: window.ethers.utils.parseEther(
          this.props.gameInfo.betAmount
        ),
        initiatorDeposit: window.ethers.utils.parseEther(
          this.props.gameInfo.betAmount
        ),
        timeout: 172800,
        initialState: {
          versionNumber: 0,
          winner: 0,
          board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        },
        intermediaries: [intermediary]
      }),
      isWaiting: true
    });
  }

  onInstall({ data: { appInstance } }) {
    this.props.onChangeAppInstance(this.state.appInstance);
    this.props.history.push(`/game?appInstanceId=${appInstance.id}`);
    window.parent.postMessage("playground:request:getBalances", "*");
  }

  onFormSubmitted(e) {
    e.preventDefault();

    const { opponent, intermediary } = this.state;
    const { user } = this.props;

    this.proposeInstall(user, opponent, intermediary);
  }

  render() {
    const { error, isLoaded, isWaiting } = this.state;
    const { user } = this.props;

    if (!isLoaded) {
      return (
        <div className="wager horizontal-constraint">
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
      <div className="wager horizontal-constraint">
        <div className="message">
          <Logo />
          <h1 className="message__title">Welcome!</h1>
          <p className="message__body">Ready to play?</p>
        </div>

        <form className="form" onSubmit={this.onFormSubmitted.bind(this)}>
          <input
            className="form__input"
            type="text"
            placeholder="Your name"
            disabled={true}
            value={user.username}
          />
          <input
            className="form__input"
            type="number"
            placeholder="0.01 eth"
            disabled={true}
            min={0}
            max={0.01}
            step={0.00000001}
            onChange={e => (this.props.gameInfo.betAmount = e.target.value)}
            defaultValue={this.props.gameInfo.betAmount}
          />
          <button type="submit" className="form__button">
            PLAY!
          </button>
          {error ? <label className="message__error">{error}</label> : []}
        </form>
      </div>
    );
  }
}

export default Wager;

function getContractAddress(migrations, contractName) {
  return migrations.filter(migration => {
    return migration.contractName === contractName;
  })[0].address;
}
