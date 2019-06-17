import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";

import LayoutHeader from "../../components/layout-header/LayoutHeader";
import Welcome from "../welcome/Welcome";

import "./App.css";

const App: React.FC = () => {
  return (
    <Router>
      <LayoutHeader />
      <div>
        <Route exact path="/" component={Welcome} />
      </div>
    </Router>
  );
};

export default App;
