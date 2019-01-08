import React, { Component } from 'react';
import Welcome from './Welcome';
import Wager from './Wager';
import Waiting from './Waiting';
import Game from './Game';
import { BrowserRouter as Router, Route } from "react-router-dom";
import MockNodeProvider from './MockNodeProvider';

export default class App extends Component {
  render() {
    const params = new URLSearchParams(window.location.search);
    const nodeProvider = params.get("standalone")
      ? new MockNodeProvider()
      : new window.NodeProvider();
    const cfProvider = new window.cf.Provider(nodeProvider);
    const state = {
      myName: params.get("myName") || "Bob",
      betAmount: params.get("betAmount") || "0.1",
      opponentName: params.get("opponentName") || "Alice",
      appInstanceId: params.get("appInstanceId")
    }
      
export default class App extends Component {
  constructor(props) {
    super(props);
    const params = new URLSearchParams(window.location.search);
    const nodeProvider = params.get("standalone")
      ? new MockNodeProvider()
      : new window.NodeProvider();
    const cfProvider = new window.cf.Provider(nodeProvider);
    const gameState = {
      myName: params.get("myName") || "Bob",
      betAmount: params.get("betAmount") || "0.1",
      opponentName: params.get("opponentName") || "Alice",
      appInstanceId: params.get("appInstanceId")
    }

    this.state = {
      connected: false,
      nodeProvider,
      cfProvider,
      gameState
    }

    this.connect(nodeProvider);
  }

  async connect() {
    await this.state.nodeProvider.connect();
    console.log("connected")
    this.setState({
      connected: true
    });
  }

  render() {
    return (
      this.state.connected ? 
        <Router>
          <div className="App">
            <Route exact path="/" component={Welcome} />
            <Route path="/wager"
              render={(props) =>
                <Wager {...props}
                  gameState={this.state.gameState}
                />}
            />
            <Route path="/waiting"
              render={(props) =>
                <Waiting {...props}
                  cfProvider={this.state.cfProvider}
                  gameState={this.state.gameState}
                />}
            />
          />
            <Route path="/game" component={Game} />
          </div>
        </Router> :
        <h1 className="App message">connecting....</h1>
    );
  }
}
