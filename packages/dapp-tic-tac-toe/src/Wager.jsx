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

    console.log("user data", this.props.user);

    try {
      // const result = await this.matchmake();
      const result = this.matchmakeBot();
      console.log(result)
      
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

  matchmakeBot() {
    return {
      data: {
        attributes: {
          email: "TTTBot@counterfactual.com",
          ethAddress: "0xA834F59237F90D28e68752d9217AA24e1447DeD3",
          multisigAddress: "0x522666ddE1E27D191B69756ce777a8DAC22BAdC3",
          nodeAddress:
            "xpub6FJUWMZ9g2JsGtTCLLKE5KWS5vGhjXshxqpg9xCtZcjyvZiMgbUuh4oV1tVVCgXmUuFA9YkK4UnEVuRckAEP4JF2vAE7G879J1CKfutaHdc",
          intermediary: "xpub6EDEcQcke2q2q5gUnhHBf3CvdE9woerHtHDxSih49EbsHEFbTxqRXEAFGmBfQHRJT57sHLnEyY1R1jPW8pycYWLbBt5mTprj8NPBeRG1C5e",
          username: "TTTBot"
        },
        id: "83ecc9fd-f594-47c0-81cf-2c502fe6f826",
        relationships: {},
        type: "user"
      }
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
    return new window.cf.AppFactory(
      // TODO: provide valid appId
      "0x32Fe8ec842ca039187f9Ed59c065A922fdF52eDe",
      {
        actionEncoding:
          "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)",
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
    const myAddress = user.ethAddress;
    const appFactory = this.createAppFactory();

    const provider = new window.ethers.providers.Web3Provider(
      window["web3"].currentProvider
    );
    const currentEthBalance = window.ethers.utils.parseEther(
      this.props.balance
    );
    const minimumEthBalance = window.ethers.utils
      .parseEther(this.props.gameInfo.betAmount)
      .add(
        await provider.estimateGas({
          to: opponent.nodeAddress,
          value: window.ethers.utils.parseEther(this.props.gameInfo.betAmount)
        })
      );

    // if (currentEthBalance.lt(minimumEthBalance)) {
    //   this.setState({
    //     error: `Insufficient funds: You need at least ${window.ethers.utils.formatEther(
    //       minimumEthBalance
    //     )} ETH to play.`
    //   });
    //   return;
    // }

    this.setState({
      appInstance: await appFactory.proposeInstallVirtual({
        proposedToIdentifier: opponent.nodeAddress,
        asset: {
          assetType: 0 /* AssetType.ETH */
        },
        peerDeposit: 0 /* window.ethers.utils.parseEther(
          this.props.gameInfo.betAmount
        ), */,
        myDeposit: 0, // window.ethers.utils.parseEther(this.props.gameInfo.betAmount),
        timeout: 100,
        initialState: {
          players: [myAddress, opponent.ethAddress],
          turnNum: 0,
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
  }

  onPlayClicked() {
    const { opponent, intermediary } = this.state;
    const { user } = this.props;

    this.proposeInstall(user, opponent, intermediary);
  }

  render() {
    const { error, isLoaded, isWaiting } = this.state;
    const { user } = this.props;
    
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
          {error ? <label class="message__error">{error}</label> : []}
        </form>
      </div>
    );
  }
}

export default Wager;
