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
      
    return (
      <Router>
        <div className="App">
          <Route exact path="/" component={Welcome} />
          <Route path="/wager"
            render={(props) =>
              <Wager {...props}
                state={state}
              />}
          />
          <Route path="/waiting"
            render={(props) =>
              <Waiting {...props}
                nodeProvider={nodeProvider}
                cfProvider={cfProvider}
                state={state}
              />}
          />
          <Route path="/game" component={Game} />
        </div>
      </Router>
    );
  }
}
