import { Web3Provider } from "ethers/providers";
import { createBrowserHistory, History } from "history";
import React, { useContext, useEffect } from "react";
import { connect } from "react-redux";
import { Route, Router, Switch } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import "./App.scss";
import { LayoutHeader } from "./components/layout";
import {
  AccountBalance,
  AccountDeposit,
  AccountRegistration,
  AccountWithdraw,
  Channels,
  Welcome
} from "./pages";
import { EthereumService } from "./providers/EthereumService";
import { ActionType, ApplicationState } from "./store/types";
import { getUser } from "./store/user/user";
import { connectToWallet, getNodeTokens } from "./store/wallet/wallet";
import { RoutePath } from "./types";

type AppProps = {
  getUser: (provider: Web3Provider, history: History) => void;
  connectToWallet: (provider: Web3Provider) => void;
  getNodeTokens: (provider: Web3Provider) => void;
};

const App: React.FC<AppProps> = ({
  getUser,
  connectToWallet,
  getNodeTokens
}) => {
  const { provider } = useContext(EthereumService);
  const history = createBrowserHistory();
  useEffect(() => {
    connectToWallet(provider);
    getUser(provider, history);
    getNodeTokens(provider);
  });
  return (
    <Router history={history}>
      <Switch>
        <Route
          exact
          path={`(${RoutePath.Root}|${RoutePath.Channels}|${RoutePath.Balance})`}
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
          <Route path={RoutePath.Balance} component={AccountBalance} />
          <Route path={RoutePath.Deposit} component={AccountDeposit} />
          <Route path={RoutePath.Withdraw} component={AccountWithdraw} />
        </Switch>
      </main>
    </Router>
  );
};
export default connect(
  null,
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    getUser: (provider: Web3Provider, history: History) =>
      dispatch(getUser(provider, history)),
    connectToWallet: (provider: Web3Provider) =>
      dispatch(connectToWallet(provider)),
    getNodeTokens: (provider: Web3Provider) => dispatch(getNodeTokens(provider))
  })
)(App);
