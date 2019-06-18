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
      <main className="wrapper__content">
        <Switch>
          <Route exact path="/" component={Welcome} />
          <Route path="/register" component={AccountRegistration} />
        </Switch>
      </main>
    </Router>
  );
};

export default App;
