import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";

import Game from "./Game";
import Wager from "./Wager";
import Welcome from "./Welcome";
function app() {
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
export default app;
