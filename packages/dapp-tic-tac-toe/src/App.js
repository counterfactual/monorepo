import React, { Component } from "react";
import Welcome from "./Welcome";
import Wager from "./Wager";
import Waiting from "./Waiting";
import Game from "./Game";
import { BrowserRouter as Router, Route } from "react-router-dom";
import MockNodeProvider from "./MockNodeProvider";

export default class App extends Component {
  constructor(props) {
    super(props);
    const params = new URLSearchParams(window.location.search);
    const nodeProvider = params.get("standalone")
      ? new MockNodeProvider()
      : new window.cf.NodeProvider();
    const cfProvider = new window.cf.Provider(nodeProvider);
    const gameInfo = {
      myName: params.get("myName") || "Bob",
      betAmount: params.get("betAmount") || "0.1",
      opponentName: params.get("opponentName") || "Alice",
      appInstanceId: params.get("appInstanceId")
    };

    this.state = {
      connected: false,
      nodeProvider,
      cfProvider,
      gameInfo,
      redirectTo: null
    };

    this.connect().then(() => {
      this.requestUserData();
      this.waitForCounterpartyAppInstance(props);
    });
  }

  async connect() {
    await this.state.nodeProvider.connect();
  }

  appInstanceChanged(appInstance) {
    this.setState({
      appInstance: appInstance
    });
  }

  requestUserData() {
    window.addEventListener("message", event => {
      if (
        typeof event.data === "string" &&
        event.data.startsWith("playground:response:user")
      ) {
        const [, data] = event.data.split("|");
        const playgroundState = JSON.parse(data);
        this.setState({
          user: playgroundState.user,
          connected: true
        });
      }
    });

    window.parent.postMessage("playground:request:user", "*");
  }

  waitForCounterpartyAppInstance(props) {
    window.addEventListener("message", event => {
      if (
        typeof event.data === "string" &&
        event.data.startsWith("playground:appInstance")
      ) {
        const [, data] = event.data.split("|");
        console.log("Received counterparty app instance", event.data);

        if (data) {
          const { appInstance } = JSON.parse(data);
          this.appInstanceChanged(appInstance);
          this.setState({
            redirectTo: `/game?appInstanceId=${appInstance.id}`
          });
        }
      }
    });
  }

  render() {
    return this.state.connected ? (
      <Router>
        <div className="App">
          <Route
            exact
            path="/"
            render={props => (
              <Welcome {...props} redirectTo={this.state.redirectTo} />
            )}
          />
          <Route
            path="/wager"
            render={props => (
              <Wager
                {...props}
                gameInfo={this.state.gameInfo}
                cfProvider={this.state.cfProvider}
                user={this.state.user}
                onChangeAppInstance={this.appInstanceChanged.bind(this)}
              />
            )}
          />
          <Route
            path="/waiting"
            render={props => (
              <Waiting
                {...props}
                cfProvider={this.state.cfProvider}
                gameInfo={this.state.gameInfo}
              />
            )}
          />
          <Route
            path="/game"
            render={props => (
              <Game
                {...props}
                cfProvider={this.state.cfProvider}
                appInstance={this.state.appInstance}
                gameInfo={this.state.gameInfo}
                user={this.state.user}
                onChangeAppInstance={this.appInstanceChanged.bind(this)}
              />
            )}
          />
        </div>
      </Router>
    ) : (
      <h1 className="App message">connecting....</h1>
    );
  }
}
