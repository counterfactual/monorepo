import { Node } from "@counterfactual/types";
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
    if (typeof web3 !== "undefined") {
      await Promise.all([this.createNodeProvider(), this.loadApps()]);
    }

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
      // This implements partial path look ups for localStorage
      async get(desiredKey: string): Promise<any> {
        const entries = {};
        const allKeys = Object.keys(window.localStorage);
        for (const key of allKeys) {
          if (key.includes(desiredKey)) {
            const val = JSON.parse(window.localStorage.getItem(key) as string);
            if (key === desiredKey) return val;
            entries[key] = val;
          } else if (key === desiredKey) {
            return JSON.parse(window.localStorage.getItem(key) as string);
          }
        }
        for (const key of Object.keys(entries)) {
          const leafKey = key.split("/")[key.split("/").length - 1];
          const value = entries[key];
          delete entries[key];
          entries[leafKey] = value;
        }
        return Object.keys(entries).length > 0 ? entries : undefined;
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

  async deposit(value: string, multisigAddress: string) {
    const { accountBalance } = this.accountState;
    const valueInWei = parseInt(value, 10);
    const node = CounterfactualNode.getInstance();

    debugger;

    this.updateAccount({
      ...this.accountState,
      accountBalance: (accountBalance as number) - valueInWei,
      unconfirmedBalance: (this.accountState.balance as number) + valueInWei
    });

    try {
      return node.call(Node.MethodName.DEPOSIT, {
        type: Node.MethodName.DEPOSIT,
        requestId: window["uuid"](),
        params: {
          multisigAddress,
          amount: ethers.utils.parseEther(value.toString()),
          notifyCounterparty: true
        } as Node.DepositParams
      });
    } catch (e) {
      this.updateAccount({
        ...this.accountState,
        accountBalance: (accountBalance as number) + valueInWei,
        unconfirmedBalance: undefined
      });
      throw e;
    }
  }

  async withdraw(value: string) {
    const { user, accountBalance } = this.accountState;
    const valueInWei = parseInt(value, 10);
    const node = CounterfactualNode.getInstance();

    this.updateAccount({
      ...this.accountState,
      accountBalance: (accountBalance as number) + valueInWei,
      unconfirmedBalance: (this.accountState.balance as number) - valueInWei
    });

    try {
      return node.call(Node.MethodName.WITHDRAW, {
        type: Node.MethodName.WITHDRAW,
        requestId: window["uuid"](),
        params: {
          multisigAddress: user.multisigAddress,
          amount: ethers.utils.parseEther(value.toString())
        } as Node.WithdrawParams
      });
    } catch (e) {
      this.updateAccount({
        ...this.accountState,
        accountBalance: (accountBalance as number) - valueInWei,
        unconfirmedBalance: undefined
      });
      throw e;
    }
  }

  waitForMultisig() {
    const { provider, user } = this.accountState;

    provider.once(user.transactionHash, async () => {
      await this.fetchMultisig();
    });
  }

  async requestToDepositInitialFunding(multisigAddress: string) {
    const { pendingAccountFunding } = this.accountState;

    if (pendingAccountFunding) {
      this.modal = (
        <widget-dialog
          visible={true}
          dialogTitle="Your account is ready!"
          content="To complete your registration, we'll ask you to confirm the deposit in the next step."
          primaryButtonText="Proceed"
          onPrimaryButtonClicked={() =>
            this.confirmDepositInitialFunding(
              pendingAccountFunding,
              multisigAddress
            )
          }
        />
      );
    }
  }

  async fetchMultisig(token?: string) {
    let userToken = token;
    if (!userToken) {
      userToken = this.accountState.user.token;
    }

    const user = await PlaygroundAPIClient.getUser(userToken as string);
    this.updateAccount({ ...this.accountState, user });

    if (!user.multisigAddress) {
      setTimeout(this.fetchMultisig.bind(this, userToken), 2500);
    } else {
      await this.requestToDepositInitialFunding(user.multisigAddress);
    }
  }

  async confirmDepositInitialFunding(
    pendingAccountFunding,
    multisigAddress: string
  ) {
    this.modal = {};

    await this.deposit(pendingAccountFunding, multisigAddress);

    this.updateAccount({
      ...this.accountState,
      pendingAccountFunding: undefined
    });
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
      deposit: this.deposit.bind(this),
      withdraw: this.withdraw.bind(this)
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
