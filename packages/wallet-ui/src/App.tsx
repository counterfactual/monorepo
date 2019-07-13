import { Web3Provider } from "ethers/providers";
import React, { useContext, useEffect } from "react";
import { connect } from "react-redux";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import "./App.scss";
import { LayoutHeader } from "./components/layout";
import {
  AccountDeposit,
  AccountRegistration,
  Channels,
  Welcome
} from "./pages";
import { EthereumService } from "./providers/EthereumService";
import { ActionType, ApplicationState } from "./store/types";
import { getUser } from "./store/user";
import { connectToWallet } from "./store/wallet";
import { RoutePath } from "./types";

type AppProps = {
  getUser: (provider: Web3Provider) => void;
  connectToWallet: () => void;
};

const App: React.FC<AppProps> = ({ getUser, connectToWallet }) => {
  const { provider } = useContext(EthereumService);

  useEffect(() => {
    connectToWallet();
    getUser(provider);
  });

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
export default connect(
  null,
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    getUser: (provider: Web3Provider) => dispatch(getUser(provider)),
    connectToWallet: () => dispatch(connectToWallet())
  })
)(App);
