import { Component, State } from "@stencil/core";
// @ts-ignore
// Needed due to https://github.com/ionic-team/stencil-router/issues/62
import { MatchResults } from "@stencil/router";

import AccountTunnel, { AccountState } from "../../data/account";
import AppRegistryTunnel, { AppRegistryState } from "../../data/app-registry";
import CounterfactualNode from "../../data/counterfactual";
import FirebaseDataProvider from "../../data/firebase";
import NetworkTunnel, { NetworkState } from "../../data/network";
import PlaygroundAPIClient from "../../data/playground-api-client";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @State() loading: boolean = true;
  @State() accountState: AccountState = {} as AccountState;
  @State() networkState: NetworkState = {};
  @State() appRegistryState: AppRegistryState = { apps: [] };

  modal: JSX.Element = <div />;

  componentWillLoad() {
    this.setup();
  }

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

  async setup() {
    await Promise.all([this.createNodeProvider(), this.loadApps()]);

    this.loading = false;
  }

  async createNodeProvider() {
    // TODO: This is a dummy firebase data provider.
    // TODO: This configuration should come from the backend.
    FirebaseDataProvider.create();

    const messagingService = FirebaseDataProvider.createMessagingService(
      "messaging"
    );
    const storeService = {
      async get(key: string): Promise<any> {
        return JSON.parse(window.localStorage.getItem(key) as string);
      },
      async set(
        pairs: {
          key: string;
          value: any;
        }[]
      ): Promise<boolean> {
        pairs.forEach(({ key, value }) => {
          window.localStorage.setItem(key, JSON.stringify(value) as string);
        });
        return true;
      }
    };

    await CounterfactualNode.create({
      messagingService,
      storeService,
      nodeConfig: {
        STORE_KEY_PREFIX: "store"
      },
      // TODO: fetch this from the provider's network
      network: "ropsten"
    });
  }

  async loadApps() {
    const apps = await PlaygroundAPIClient.getApps();

    this.updateAppRegistry({ apps });
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

  private buildSignatureMessageForLogin(address: string) {
    return ["PLAYGROUND ACCOUNT LOGIN", `Ethereum address: ${address}`].join(
      "\n"
    );
  }

  async login() {
    const { signer, user } = this.accountState;
    const signature = await signer.signMessage(
      this.buildSignatureMessageForLogin(user.ethAddress)
    );

    const loggedUser = await PlaygroundAPIClient.login(
      {
        ethAddress: user.ethAddress
      },
      signature
    );

    await this.getBalances();

    window.localStorage.setItem(
      "playground:user:token",
      loggedUser.token as string
    );

    this.updateAccount({ ...this.accountState, user: loggedUser });

    return loggedUser;
  }

  async getBalances() {
    const { user, provider } = this.accountState;

    if (!user.multisigAddress || !user.ethAddress) {
      return;
    }

    const multisigBalance = parseFloat(
      ethers.utils.formatEther(
        (await provider.getBalance(user.multisigAddress)).toString()
      )
    );

    const walletBalance = parseFloat(
      ethers.utils.formatEther(
        (await provider.getBalance(user.ethAddress)).toString()
      )
    );

    this.updateAccount({
      ...this.accountState,
      balance: multisigBalance,
      accountBalance: walletBalance
    });

    return {
      balance: multisigBalance,
      accountBalance: walletBalance
    };
  }

  async deposit(value) {
    const { user, signer, provider } = this.accountState;

    const tx = {
      value,
      to: user.multisigAddress
    };

    await signer.sendTransaction({
      ...tx,
      gasPrice: await provider.estimateGas(tx)
    });

    this.updateAccount({
      ...this.accountState,
      unconfirmedBalance: parseFloat(ethers.utils.formatEther(value))
    });
  }

  waitForMultisig() {
    setTimeout(async () => {
      const { token } = this.accountState.user;
      const user = await PlaygroundAPIClient.getUser(token as string);

      if (!user.multisigAddress) {
        this.waitForMultisig();
        return;
      }

      this.updateAccount({ ...this.accountState, user });
      await this.requestToDepositInitialFunding();
    }, 5000);
  }

  async requestToDepositInitialFunding() {
    const { pendingAccountFunding } = this.accountState;

    if (pendingAccountFunding) {
      this.modal = (
        <widget-dialog
          visible={true}
          dialogTitle="Your account is ready!"
          content="To complete your registration, we'll ask you to confirm the deposit in the next step."
          primaryButtonText="Proceed"
          onPrimaryButtonClicked={() =>
            this.confirmDepositInitialFunding(pendingAccountFunding)
          }
        />
      );
    }
  }

  async confirmDepositInitialFunding(pendingAccountFunding) {
    await this.deposit(pendingAccountFunding);
    this.updateAccount({
      ...this.accountState,
      pendingAccountFunding: undefined
    });
    this.modal = {};
  }

  async autoLogin() {
    const token = window.localStorage.getItem(
      "playground:user:token"
    ) as string;

    if (!token) {
      return;
    }

    const { user } = this.accountState;

    if (!user || !user.username) {
      try {
        const loggedUser = await PlaygroundAPIClient.getUser(token);
        this.updateAccount({ ...this.accountState, user: loggedUser });
      } catch {
        window.localStorage.removeItem("playground:user:token");
        return;
      }
    }

    if (!this.accountState.user.multisigAddress) {
      this.waitForMultisig();
    } else {
      await this.getBalances();
    }
  }

  render() {
    this.accountState = {
      ...this.accountState,
      updateAccount: this.updateAccount.bind(this),
      waitForMultisig: this.waitForMultisig.bind(this),
      login: this.login.bind(this),
      getBalances: this.getBalances.bind(this),
      autoLogin: this.autoLogin.bind(this),
      deposit: this.deposit.bind(this)
    };

    this.networkState.updateNetwork = this.updateNetwork.bind(this);
    this.appRegistryState.updateAppRegistry = this.updateAppRegistry.bind(this);

    if (this.loading) {
      return;
    }

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
              <webthree-connector
                accountState={this.accountState}
                networkState={this.networkState}
              />
              {this.modal || {}}
            </div>
          </AppRegistryTunnel.Provider>
        </AccountTunnel.Provider>
      </NetworkTunnel.Provider>
    );
  }
}
