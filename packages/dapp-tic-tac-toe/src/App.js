import React from 'react';
import Welcome from './Welcome';
import Wager from './Wager';
import Game from './Game';
import { BrowserRouter as Router, Route } from "react-router-dom";

function App() {
  return (
      <Router>
        <div className="App">
          <Route exact path="/" component={Welcome} />
          <Route path="/wager" component={Wager} />
          <Route path="/game" component={Game} />
        </div>
      </Router>

  );
}

export default App;
