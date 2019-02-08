import { Component, State } from "@stencil/core";
// @ts-ignore
// Needed due to https://github.com/ionic-team/stencil-router/issues/62
import { MatchResults } from "@stencil/router";

import AccountTunnel, { AccountState } from "../../data/account";
import AppRegistryTunnel, { AppRegistryState } from "../../data/app-registry";
import NetworkTunnel, { NetworkState } from "../../data/network";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @State() accountState: AccountState = {} as AccountState;
  @State() networkState: NetworkState = {};
  @State() appRegistryState: AppRegistryState = { apps: [] };

  async updateAccount(newProps: AccountState) {
    this.accountState = { ...this.accountState, ...newProps };
    this.bindProviderEvents();
  }

  async updateNetwork(newProps: NetworkState) {
    this.networkState = { ...this.networkState, ...newProps };
  }

  async updateAppRegistry(newProps: AppRegistryState) {
    this.appRegistryState = { ...this.appRegistryState, ...newProps };
  }

  async updateMultisigBalance(ethBalance: any) {
    // TODO: This comparison might need changes if the user's doing
    // deposits beyond the registration flow.
    if (ethBalance._hex === "0x0" && this.accountState.unconfirmedBalance) {
      return;
    }

    const balance = parseFloat(ethers.utils.formatEther(ethBalance.toString()));

    this.accountState = {
      ...this.accountState,
      balance,
      unconfirmedBalance: undefined
    };
  }

  async updateWalletBallance(ethBalance: any) {
    const balance = parseFloat(ethers.utils.formatEther(ethBalance.toString()));

    this.accountState = { ...this.accountState, accountBalance: balance };
  }

  bindProviderEvents() {
    const { provider, user } = this.accountState;

    if (!provider) {
      return;
    }

    if (user.ethAddress) {
      provider.removeAllListeners(user.ethAddress);
      provider.on(user.ethAddress, this.updateWalletBallance.bind(this));
    }

    if (user.multisigAddress) {
      provider.removeAllListeners(user.multisigAddress);
      provider.on(user.multisigAddress, this.updateMultisigBalance.bind(this));
    }
  }

  render() {
    this.accountState.updateAccount = this.updateAccount.bind(this);
    this.networkState.updateNetwork = this.updateNetwork.bind(this);
    this.appRegistryState.updateAppRegistry = this.updateAppRegistry.bind(this);

    return (
      <NetworkTunnel.Provider state={this.networkState}>
        <AccountTunnel.Provider state={this.accountState}>
          <AppRegistryTunnel.Provider state={this.appRegistryState}>
            <div class="app-root wrapper">
              <main class="wrapper__content">
                <stencil-router>
                  <stencil-route-switch scrollTopOffset={0}>
                    <stencil-route url="/" component="app-home" exact={true} />
                    <stencil-route
                      url="/"
                      component="node-listener"
                      exact={true}
                    />
                    <stencil-route
                      url="/dapp/:dappName"
                      component="dapp-container"
                    />
                    <stencil-route url="/account" component="account-edit" />
                    <stencil-route
                      url="/exchange"
                      component="account-exchange"
                    />
                    <stencil-route
                      url="/register"
                      component="account-register"
                    />
                    <stencil-route url="/deposit" component="account-deposit" />
                  </stencil-route-switch>
                </stencil-router>
              </main>
              <web3-connector
                accountState={this.accountState}
                networkState={this.networkState}
              />
            </div>
          </AppRegistryTunnel.Provider>
        </AccountTunnel.Provider>
      </NetworkTunnel.Provider>
    );
  }
}
