import React, { Component } from 'react';

/**
 * User Story
 * Bob(Proposing) waits for Alice(Accepting) to install the game
 */
export default class Waiting extends Component {
  /**
   * Bob(Proposing) enters waiting room.
   * Bob(Proposing) makes a call to Playground for matchmaking and waits to get an Accepting player.
   * Bob(Proposing) makes a call to CF.js proposeInstall.
   * Bob(Proposing) waits for Alice(Accepting) to approve -- Add Waiting Room (Waiting for Alice) --
   */
  constructor(props) {
    super(props);
    
    this.state = {
      seconds: 5
    };
  }

  componentDidMount() {
    this.countDown();
    this.initialize();
  }

  componentWillUnmount() {
    clearTimeout(this.countdownTimeout);
  }

  async initialize() {
    if (!this.props.gameInfo.shouldMatchmake) {
      const opponent = await this.matchmake();
      this.proposeInstall(opponent)
    } else {
      this.install();
    }

    this.props.cfProvider.once("install", this.onInstall.bind(this));
  }

  onInstall({ data: { appInstance }}) {
    this.props.onChangeAppInstance(appInstance);
    this.props.history.push(`/game?appInstanceId=${appInstance.id}`);
  }

  matchmake() {
    return new Promise(resolve => {
      resolve({
        username: "Bob",
        address: "0x1234567890abcdefghijklmnop"
      });
    });
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

  /**
   * Bob(Proposing) makes a call to CF.js proposeInstall.
   * Bob(Proposing) waits for Alice(Accepting) to approve -- Add Waiting Room (Waiting for Alice) --
   */
  async proposeInstall(opponent) {
    // TODO: provide user's actual address
    const myAddress = "888";
    const appFactory = this.createAppFactory();

    appFactory.proposeInstallVirtual({
      peerAddress: opponent.address,
      asset: {
        assetType: 0 /* AssetType.ETH */
      },
      peerDeposit: window.ethers.utils.parseEther(this.props.gameInfo.betAmount),
      myDeposit: window.ethers.utils.parseEther(this.props.gameInfo.betAmount),
      timeout: 100,
      initialState: {
        address: [myAddress, opponent.address],
        turnNum: 0,
        winner: 0,
        board: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ]
      },
      // TODO: provide valid intermediary addresses, namely the playground server's eth addr
      intermediaries: ["0x2515151515151515151515151515151515151515"]
    });
  }

  /**
   * Alice(Accepting) receives a notification that Bob(Proposing) has invited them to play High Roller
   * Alice(Accepting) approves the initiation. Playground calls CF.js install
   * Bob(Proposing) moves out of the waiting room and into the game
   */
  async install() {
    this.props.cfProvider.installVirtual({
      appInstanceId: this.props.gameInfo.appInstanceId,
      // TODO: provide valid intermediary addresses, namely the playground server's eth addr
      intermediaries: ["0x2515151515151515151515151515151515151515"]
    });
  }

  createAppFactory() {
    return new window.cf.AppFactory(
      // TODO: provide valid appId
      "0x1515151515151515151515151515151515151515",
      {
        actionEncoding: "tuple(ActionType actionType, uint256 playX, uint256 playY, WinClaim winClaim)",
        stateEncoding: "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)"
      },
      this.props.cfProvider
    );
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