import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { LayoutHeader } from "./components/layout";
import { Welcome, AccountRegistration } from "./pages";

import "./App.scss";

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={LayoutHeader} />
      </Switch>
      <Switch>
        <main className="wrapper__content">
          <Route exact path="/" component={Welcome} />
          <Route path="/register" component={AccountRegistration} />
        </main>
      </Switch>
    </Router>
  );
};

export default App;
