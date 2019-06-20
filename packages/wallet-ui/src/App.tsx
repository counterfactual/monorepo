import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { LayoutHeader } from "./components/layout";
import {
  Welcome,
  AccountRegistration,
  AccountDeposit,
  Channels
} from "./pages";
import { RoutePath } from "./types";

import "./App.scss";

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route
          exact
          path={`(${RoutePath.Root}|${RoutePath.Channels})`}
          component={LayoutHeader}
        />
      </Switch>
      <main className="wrapper__content">
        <Switch>
          <Route exact path={RoutePath.Root} component={Welcome} />
          <Route
            path={RoutePath.SetupRegister}
            component={AccountRegistration}
          />
          <Route path={RoutePath.SetupDeposit} component={AccountDeposit} />
          <Route path={RoutePath.Channels} component={Channels} />
        </Switch>
      </main>
    </Router>
  );
};

export default App;
