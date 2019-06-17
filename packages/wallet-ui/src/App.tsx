import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { LayoutHeader } from "./components/layout";
import { Welcome, AccountRegistration } from "./pages";

import "./styles/ui.scss";
import "./App.scss";

const App: React.FC = () => {
  return (
    <div className="app-root wrapper">
      <main className="wrapper__content">
        <Router>
          <Switch>
            <Route exact path="/" component={LayoutHeader} />
          </Switch>
          <Switch>
            <Route exact path="/" component={Welcome} />
            <Route path="/register" component={AccountRegistration} />
          </Switch>
        </Router>
      </main>
    </div>
  );
};

export default App;
