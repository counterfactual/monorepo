import { Component, State } from "@stencil/core";
// @ts-ignore
// Needed due to https://github.com/ionic-team/stencil-router/issues/62
import { MatchResults } from "@stencil/router";

import AccountTunnel, { State as AccountState } from "../../data/account";
import NetworkTunnel, { State as NetworkState } from "../../data/network";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @State() accountState: AccountState = {};
  @State() networkState: NetworkState = {
    network: "Lorem"
  };

  updateAccount(newProps) {
    this.accountState = Object.assign({}, this.accountState, newProps);
  }

  render() {
    const accountState = this.accountState;

    accountState.updateAccount = this.updateAccount.bind(this);

    return (
      <NetworkTunnel.Provider state={this.networkState}>
        <AccountTunnel.Provider state={accountState}>
          <div class="app-root wrapper">
            <main class="wrapper__content">
              <stencil-router>
                <stencil-route-switch scrollTopOffset={0}>
                  <stencil-route url="/" component="app-home" exact={true} />
                  <stencil-route
                    url="/dapp/:dappName"
                    component="dapp-container"
                  />
                  <stencil-route url="/account" component="account-edit" />
                  <stencil-route url="/exchange" component="account-exchange" />
                  <stencil-route url="/register" component="account-register" />
                  <stencil-route url="/deposit" component="account-deposit" />
                </stencil-route-switch>
              </stencil-router>
            </main>
            <layout-footer />
            <node-listener />
          </div>
        </AccountTunnel.Provider>
      </NetworkTunnel.Provider>
    );
  }
}
