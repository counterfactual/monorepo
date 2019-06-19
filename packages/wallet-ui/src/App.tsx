import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { LayoutHeader } from "./components/layout";
import {
  Welcome,
  AccountRegistration,
  AccountDeposit,
  Channels
} from "./pages";

import "./App.scss";

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="(/|/channels)" component={LayoutHeader} />
      </Switch>
      <main className="wrapper__content">
        <Switch>
          <Route exact path="/" component={Welcome} />
          <Route path="/setup/register" component={AccountRegistration} />
          <Route path="/setup/deposit" component={AccountDeposit} />
          <Route path="/channels" component={Channels} />
        </Switch>
      </main>
    </Router>
  );
};

export default App;
