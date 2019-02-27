import { Node } from "@counterfactual/types";
import { Component, State } from "@stencil/core";
// @ts-ignore
// Needed due to https://github.com/ionic-team/stencil-router/issues/62
import { MatchResults } from "@stencil/router";

import AccountTunnel, { AccountState } from "../../data/account";
import AppRegistryTunnel, { AppRegistryState } from "../../data/app-registry";
import CounterfactualNode from "../../data/counterfactual";
import FirebaseDataProvider, {
  FirebaseAppConfiguration
} from "../../data/firebase";
import PlaygroundAPIClient from "../../data/playground-api-client";
import WalletTunnel, { WalletState } from "../../data/wallet";

const TIER: string = "ENV:TIER";
const FIREBASE_SERVER_HOST: string = "ENV:FIREBASE_SERVER_HOST";
const FIREBASE_SERVER_PORT: string = "ENV:FIREBASE_SERVER_PORT";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @State() loading: boolean = true;
  @State() accountState: AccountState = {} as AccountState;
  @State() walletState: WalletState = {};
  @State() appRegistryState: AppRegistryState = { apps: [] };
  @State() hasLocalStorage: boolean = false;

  modal: JSX.Element = <div />;

  componentWillLoad() {
    // Test for Local Storage.
    try {
      localStorage.setItem("playground:localStorage", "true");
      localStorage.removeItem("playground:localStorage");
      this.hasLocalStorage = true;
    } catch {
      this.hasLocalStorage = false;
    }

    this.setup();
  }

  async updateAccount(newProps: Partial<AccountState>) {
    this.accountState = { ...this.accountState, ...newProps };
    this.bindProviderEvents();
  }

  async updateWalletConnection(newProps: WalletState) {
    this.walletState = { ...this.walletState, ...newProps };
  }

  async updateAppRegistry(newProps: AppRegistryState) {
    this.appRegistryState = { ...this.appRegistryState, ...newProps };
  }

  async updateMultisigBalance(ethBalance: any) {
    // TODO: This comparison might need changes if the user's doing
    // deposits beyond the registration flow.
    if (
      ethBalance.eq(ethers.constants.Zero) &&
      this.accountState.ethPendingDepositAmountWei
    ) {
      return;
    }

    this.updateAccount({
      ethMultisigBalance: ethBalance,
      ethPendingDepositAmountWei: undefined
    });
  }

  async updateWalletBalance(ethWeb3WalletBalance: BigNumber) {
    await this.updateWalletConnection({ ethWeb3WalletBalance });
  }

  async setup() {
    if (typeof window["web3"] !== "undefined") {
      await Promise.all([this.createNodeProvider(), this.loadApps()]);
    }

    this.loading = false;
  }

  async createNodeProvider() {
    if (!this.hasLocalStorage) {
      return;
    }

    // TODO: This is a dummy firebase data provider.
    // TODO: This configuration should come from the backend.
    let configuration: FirebaseAppConfiguration = {
      apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
      authDomain: "foobar-91a31.firebaseapp.com",
      databaseURL: "https://foobar-91a31.firebaseio.com",
      projectId: "foobar-91a31",
      storageBucket: "foobar-91a31.appspot.com",
      messagingSenderId: "432199632441"
    };

    if (TIER === "dev") {
      configuration = {
        databaseURL: `ws://${FIREBASE_SERVER_HOST}:${FIREBASE_SERVER_PORT}`,
        projectId: "",
        apiKey: "",
        authDomain: "",
        storageBucket: "",
        messagingSenderId: ""
      };
    }

    FirebaseDataProvider.create(configuration);

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
      // TODO: handle changes on the UI
      network: "ropsten"
    });
  }

  async loadApps() {
    const apps = await PlaygroundAPIClient.getApps();

    this.updateAppRegistry({ apps });
  }

  bindProviderEvents() {
    const { user } = this.accountState;
    const { provider } = this.walletState;

    if (!provider) {
      return;
    }

    if (user.ethAddress) {
      provider.removeAllListeners(user.ethAddress);
      provider.on(user.ethAddress, this.updateWalletBalance.bind(this));
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
    const { user } = this.accountState;

    const signer = this.walletState.signer as Signer;

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

    await this.updateAccount({ user: loggedUser });

    return loggedUser;
  }

  async getBalances(): Promise<{
    ethFreeBalanceWei: BigNumber;
    ethMultisigBalance: BigNumber;
  }> {
    const {
      user: { multisigAddress, ethAddress }
    } = this.accountState;
    const { provider } = this.walletState;
    const node = CounterfactualNode.getInstance();

    if (!multisigAddress || !ethAddress) {
      return {
        ethFreeBalanceWei: ethers.constants.Zero,
        ethMultisigBalance: ethers.constants.Zero
      };
    }

    const query = {
      type: Node.MethodName.GET_MY_FREE_BALANCE_FOR_STATE,
      requestId: window["uuid"](),
      params: { multisigAddress } as Node.GetMyFreeBalanceForStateParams
    };

    const { result } = await node.call(query.type, query);

    const { balance } = result as Node.GetMyFreeBalanceForStateResult;

    const vals = {
      ethFreeBalanceWei: ethers.utils.bigNumberify(balance),
      ethMultisigBalance: await provider!.getBalance(multisigAddress)
    };

    await this.updateAccount(vals);

    return vals;
  }

  async resetPendingDepositState() {
    await this.updateAccount({
      ethPendingDepositAmountWei: undefined,
      ethPendingDepositTxHash: undefined
    });
  }

  async resetPendingWithdrawalState() {
    await this.updateAccount({
      ethPendingWithdrawalAmountWei: undefined,
      ethPendingWithdrawalTxHash: undefined
    });
  }

  async deposit(valueInWei: BigNumber) {
    const {
      user: { multisigAddress }
    } = this.accountState;

    const node = CounterfactualNode.getInstance();

    node.once(Node.EventName.DEPOSIT_STARTED, args => {
      this.updateAccount({
        ethPendingDepositTxHash: args.txHash,
        ethPendingDepositAmountWei: valueInWei
      });
    });

    try {
      const ret = await node.call(Node.MethodName.DEPOSIT, {
        type: Node.MethodName.DEPOSIT,
        requestId: window["uuid"](),
        params: {
          multisigAddress,
          amount: ethers.utils.bigNumberify(valueInWei),
          notifyCounterparty: true
        } as Node.DepositParams
      });
      await this.resetPendingDepositState();
      return ret;
    } catch (e) {
      await this.resetPendingDepositState();
      throw e;
    }
  }

  async withdraw(valueInWei: BigNumber) {
    const {
      user: { multisigAddress }
    } = this.accountState;

    const node = CounterfactualNode.getInstance();

    node.once(Node.EventName.WITHDRAWAL_STARTED, args => {
      this.updateAccount({
        ethPendingWithdrawalTxHash: args.txHash,
        ethPendingWithdrawalAmountWei: valueInWei
      });
    });

    try {
      const ret = await node.call(Node.MethodName.WITHDRAW, {
        type: Node.MethodName.WITHDRAW,
        requestId: window["uuid"](),
        params: {
          multisigAddress,
          recipient: this.accountState.user.ethAddress,
          amount: ethers.utils.bigNumberify(valueInWei)
        } as Node.WithdrawParams
      });
      await this.resetPendingWithdrawalState();
      await this.getBalances();
      return ret;
    } catch (e) {
      await this.resetPendingWithdrawalState();
      throw e;
    }
  }

  waitForMultisig() {
    const { user } = this.accountState;
    const provider = this.walletState.provider as Web3Provider;

    provider.once(user.transactionHash, async () => {
      await this.fetchMultisig();
    });
  }

  async requestToDepositInitialFunding() {
    const { precommitedDepositAmountWei } = this.accountState;

    if (precommitedDepositAmountWei) {
      this.modal = (
        <widget-dialog
          visible={true}
          dialogTitle="Your account is ready!"
          content="To complete your registration, we'll ask you to confirm the deposit in the next step."
          primaryButtonText="Proceed"
          onPrimaryButtonClicked={() => this.confirmDepositInitialFunding()}
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

    this.updateAccount({ user });

    if (!user.multisigAddress) {
      setTimeout(this.fetchMultisig.bind(this, userToken), 1000);
    } else {
      await this.requestToDepositInitialFunding();
    }
  }

  async confirmDepositInitialFunding() {
    this.modal = {};

    await this.deposit(this.accountState
      .precommitedDepositAmountWei as BigNumber);

    this.updateAccount({
      precommitedDepositAmountWei: undefined
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
        this.updateAccount({ user: loggedUser });
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

    this.walletState.updateWalletConnection = this.updateWalletConnection.bind(
      this
    );
    this.appRegistryState.updateAppRegistry = this.updateAppRegistry.bind(this);

    if (this.loading) {
      return;
    }

    return (
      <WalletTunnel.Provider state={this.walletState}>
        <AccountTunnel.Provider state={this.accountState}>
          <AppRegistryTunnel.Provider state={this.appRegistryState}>
            <div class="app-root wrapper">
              <main class="wrapper__content">
                {this.hasLocalStorage ? (
                  <stencil-router>
                    <stencil-route-switch scrollTopOffset={0}>
                      <stencil-route
                        url="/"
                        component="app-home"
                        exact={true}
                        componentProps={{
                          hasLocalStorage: this.hasLocalStorage
                        }}
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
                      <stencil-route
                        url="/deposit"
                        component="account-deposit"
                      />
                    </stencil-route-switch>
                  </stencil-router>
                ) : (
                  <app-home hasLocalStorage={this.hasLocalStorage} />
                )}
              </main>
              <webthree-connector
                accountState={this.accountState}
                walletState={this.walletState}
              />
              {this.modal || {}}
            </div>
          </AppRegistryTunnel.Provider>
        </AccountTunnel.Provider>
      </WalletTunnel.Provider>
    );
  }
}
