import { CreateChannelMessage } from "@counterfactual/node";
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
import { UserSession } from "../../types";

const TIER: string = "ENV:TIER";
const FIREBASE_SERVER_HOST: string = "ENV:FIREBASE_SERVER_HOST";
const FIREBASE_SERVER_PORT: string = "ENV:FIREBASE_SERVER_PORT";
const FIREBASE_API_KEY: string = "ENV:FIREBASE_API_KEY";
const FIREBASE_AUTH_DOMAIN: string = "ENV:FIREBASE_AUTH_DOMAIN";
const FIREBASE_DATABASE_URL: string = "ENV:FIREBASE_DATABASE_URL";
const FIREBASE_MESSAGING_SENDER_ID: string = "ENV:FIREBASE_MESSAGING_SENDER_ID";
const FIREBASE_PROJECT_ID: string = "ENV:FIREBASE_PROJECT_ID";
const FIREBASE_STORAGE_BUCKET: string = "ENV:FIREBASE_STORAGE_BUCKET";

// Only Kovan is supported for now
const NETWORK_NAME_URL_PREFIX_ON_ETHERSCAN = {
  "42": "kovan"
};

const TWO_BLOCK_TIMES_ON_AVG_ON_KOVAN = 24 * 1000;
const HEARTBEAT_INTERVAL = 30 * 1000;

const delay = (timeInMilliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, timeInMilliseconds));

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @State() loading: boolean = true;
  @State() accountState: AccountState = {
    enoughCounterpartyBalance: true,
    enoughLocalBalance: true
  } as AccountState;
  @State() walletState: WalletState = {};
  @State() appRegistryState: AppRegistryState = {
    apps: [],
    canUseApps: false,
    schemaVersion: "",
    maintenanceMode: false
  };
  @State() hasLocalStorage: boolean = false;
  @State() balancePolling: any;

  @State() modal: JSX.Element = <div />;
  @State() redirect: JSX.Element = <div />;

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
    this.setSentryUser(this.accountState);
  }

  setSentryUser(accountState: AccountState) {
    window["Sentry"].configureScope(scope => {
      scope.setUser({
        email: accountState.user.email,
        username: accountState.user.username,
        id: accountState.user.id
      });
      scope.setExtra("ethAddress", accountState.user.ethAddress);
      scope.setExtra("multisigAddress", accountState.user.multisigAddress);
      scope.setExtra("nodeAddress", accountState.user.nodeAddress);
    });
  }

  async updateWalletConnection(newProps: WalletState) {
    this.walletState = { ...this.walletState, ...newProps };
  }

  async updateAppRegistry(newProps: Partial<AppRegistryState>) {
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
    this.loadEnv();
    this.loadSentry();

    if (typeof window["web3"] !== "undefined") {
      await Promise.all([
        this.heartbeat(),
        this.createNodeProvider(),
        this.loadApps()
      ]);
    }

    this.loading = false;
  }

  async redirectToDeposit() {
    this.modal = {};
    this.redirect = <stencil-router-redirect url="/deposit" />;
  }

  async createNodeProvider() {
    if (!this.hasLocalStorage) {
      return;
    }

    let configuration: FirebaseAppConfiguration;
    if (TIER === "dev") {
      configuration = {
        databaseURL: `ws://${FIREBASE_SERVER_HOST}:${FIREBASE_SERVER_PORT}`,
        projectId: "",
        apiKey: "",
        authDomain: "",
        storageBucket: "",
        messagingSenderId: ""
      };
    } else {
      configuration = {
        apiKey: FIREBASE_API_KEY,
        authDomain: FIREBASE_AUTH_DOMAIN,
        databaseURL: FIREBASE_DATABASE_URL,
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: FIREBASE_STORAGE_BUCKET,
        messagingSenderId: FIREBASE_MESSAGING_SENDER_ID
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
      // TODO: handle changes on the UI
      network: "kovan"
    });
  }

  loadEnv() {
    if (TIER === "dev") {
      window["globalConfig"] = {
        TIER: "dev"
      };
    } else {
      window["globalConfig"] = {
        TIER
      };
    }
  }

  loadSentry() {
    if (TIER === "dev") {
      // Do nothing
    } else {
      window["Sentry"].init({
        dsn: "https://6037586d37124e518f4718d9dd46b18b@sentry.io/1383439",
        release: `playground@${Date.now()}`,
        environment: TIER
      });
    }
  }

  async loadApps() {
    const apps = await PlaygroundAPIClient.getApps();

    await this.updateAppRegistry({ apps });
  }

  async heartbeat() {
    setInterval(async () => this.doHeartbeat(), HEARTBEAT_INTERVAL);
    this.doHeartbeat();
  }

  async doHeartbeat() {
    const heartbeat = await PlaygroundAPIClient.getHeartbeat();
    this.updateAppRegistry({ ...heartbeat });
  }

  bindProviderEvents() {
    const {
      user: { multisigAddress, ethAddress }
    } = this.accountState;
    const { provider } = this.walletState;

    if (!provider || !multisigAddress || !ethAddress) {
      return;
    }

    if (ethAddress) {
      provider.removeAllListeners(ethAddress);
      provider.on(ethAddress, this.updateWalletBalance.bind(this));
    }

    if (multisigAddress) {
      provider.removeAllListeners(multisigAddress);
      provider.on(multisigAddress, this.updateMultisigBalance.bind(this));
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

    window.localStorage.setItem(
      "playground:user:token",
      loggedUser.token as string
    );

    await this.updateAccount({ user: loggedUser });

    await this.getBalances();

    return loggedUser;
  }

  async deleteAccount(): Promise<void> {
    const token = window.localStorage.getItem(
      "playground:user:token"
    ) as string;

    if (!token) {
      console.error("Couldn't delete account; no token was provided");
      return;
    }

    const user = await PlaygroundAPIClient.getUser(token);

    try {
      await PlaygroundAPIClient.deleteAccount(user);
      this.updateAccount({ hasCorruptStateChannelState: false });
    } finally {
      this.logout();
      return;
    }
  }

  async getBalances({ poll = false } = {}): Promise<{
    ethFreeBalanceWei: BigNumber;
    ethMultisigBalance: BigNumber;
  }> {
    const MINIMUM_EXPECTED_FREE_BALANCE = ethers.utils.parseEther("0.01");

    const {
      user: { multisigAddress, ethAddress, nodeAddress }
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
      type: Node.MethodName.GET_FREE_BALANCE_STATE,
      requestId: window["uuid"](),
      params: { multisigAddress } as Node.GetFreeBalanceStateParams
    };

    let response;

    try {
      response = await node.call(query.type, query);
    } catch (e) {
      // TODO: Use better typed error messages with error codes
      if (e.includes("Call to getStateChannel failed")) {
        await this.updateAccount({ hasCorruptStateChannelState: true });
        return {
          ethFreeBalanceWei: ethers.constants.Zero,
          ethMultisigBalance: ethers.constants.Zero
        };
      }

      throw e;
    }

    const { state } = response.result as Node.GetFreeBalanceStateResult;

    // Had to reimplement this on the frontend because the method can't be imported
    // due to ethers not playing nice with ES Modules in this context.
    const getAddress = (xkey: string, k: number) =>
      ethers.utils.computeAddress(
        ethers.utils.HDNode.fromExtendedKey(xkey).derivePath(String(k))
          .publicKey
      );

    const balances = [
      ethers.utils.bigNumberify(state.aliceBalance),
      ethers.utils.bigNumberify(state.bobBalance)
    ];

    const [myBalance, counterpartyBalance] = [
      balances[
        [state.alice, state.bob].findIndex(
          address => address === getAddress(nodeAddress, 0)
        )
      ],
      balances[
        [state.alice, state.bob].findIndex(
          address => address !== getAddress(nodeAddress, 0)
        )
      ]
    ];

    const vals = {
      ethFreeBalanceWei: myBalance,
      ethMultisigBalance: await provider!.getBalance(multisigAddress),
      ethCounterpartyFreeBalanceWei: counterpartyBalance
    };

    const enoughCounterpartyBalance = counterpartyBalance.gte(
      MINIMUM_EXPECTED_FREE_BALANCE
    );
    const enoughLocalBalance = myBalance.gte(MINIMUM_EXPECTED_FREE_BALANCE);
    const canUseApps = enoughCounterpartyBalance && enoughLocalBalance;

    await this.updateAppRegistry({
      canUseApps
    });

    await this.updateAccount({
      ...vals,
      enoughCounterpartyBalance,
      enoughLocalBalance
    });

    // TODO: Replace this with a more event-driven approach,
    // based on a list of collateralized deposits.
    if (poll) {
      if (canUseApps) {
        clearTimeout(this.balancePolling);
      } else {
        this.balancePolling = setTimeout(
          async () => this.getBalances({ poll }),
          1000
        );
      }
    }

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
    const token = localStorage.getItem("playground:user:token")!;
    const { multisigAddress } = await PlaygroundAPIClient.getUser(token);

    const node = CounterfactualNode.getInstance();

    node.once(Node.EventName.DEPOSIT_STARTED, args =>
      this.updateAccount({
        ethPendingDepositTxHash: args.txHash,
        ethPendingDepositAmountWei: valueInWei
      })
    );

    let ret;

    try {
      const amount = ethers.utils.bigNumberify(valueInWei);

      ret = await node.call(Node.MethodName.DEPOSIT, {
        type: Node.MethodName.DEPOSIT,
        requestId: window["uuid"](),
        params: {
          amount,
          multisigAddress,
          notifyCounterparty: true
        } as Node.DepositParams
      });
    } catch (e) {
      console.error(e);
    }

    await this.getBalances({ poll: true });
    await this.resetPendingDepositState();

    return ret;
  }

  async withdraw(valueInWei: BigNumber): Promise<Node.MethodResponse> {
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

    let ret;

    try {
      ret = await node.call(Node.MethodName.WITHDRAW, {
        type: Node.MethodName.WITHDRAW,
        requestId: window["uuid"](),
        params: {
          multisigAddress,
          recipient: this.accountState.user.ethAddress,
          amount: ethers.utils.bigNumberify(valueInWei)
        } as Node.WithdrawParams
      });
    } catch (e) {
      console.error(e);
    }

    await this.getBalances();
    await this.resetPendingWithdrawalState();

    return ret;
  }

  waitForMultisig() {
    const node = CounterfactualNode.getInstance();
    node.once(
      Node.EventName.CREATE_CHANNEL,
      this.setMultisigAddress.bind(this)
    );
  }

  async setMultisigAddress(createChannelMsg: CreateChannelMessage) {
    const { user } = this.accountState;
    user.multisigAddress = createChannelMsg.data.multisigAddress;
    await this.updateAccount({ user });
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
        this.logout();
        return;
      }
    }

    if (!this.accountState.user.multisigAddress) {
      this.waitForMultisig();
    } else {
      await this.getBalances();
    }
  }

  logout() {
    window.localStorage.removeItem("playground:user:token");
    this.updateAccount({ user: {} as UserSession });
  }

  getEtherscanAddressURL(address: string) {
    return `https://${
      NETWORK_NAME_URL_PREFIX_ON_ETHERSCAN[this.walletState.network as string]
    }.etherscan.io/address/${address}`;
  }

  getEtherscanTxURL(tx: string) {
    return `https://${
      NETWORK_NAME_URL_PREFIX_ON_ETHERSCAN[this.walletState.network as string]
    }.etherscan.io/tx/${tx}`;
  }

  upgrade() {
    const keysToPreserve = ["MNEMONIC", "playground:matchmakeWith"];

    const preservedKeys = keysToPreserve
      .map(key => ({ [key]: localStorage.getItem(key) as string }))
      .reduce((obj, keyContainer) => ({ ...obj, ...keyContainer }), {});

    window.localStorage.clear();

    keysToPreserve.forEach(key => {
      window.localStorage.setItem(key, preservedKeys[key]);
    });

    window.localStorage.setItem(
      "playground:schemaVersion",
      this.appRegistryState.schemaVersion
    );

    window.location.reload();
  }

  render() {
    this.accountState = {
      ...this.accountState,
      updateAccount: this.updateAccount.bind(this),
      waitForMultisig: this.waitForMultisig.bind(this),
      login: this.login.bind(this),
      logout: this.logout.bind(this),
      deleteAccount: this.deleteAccount.bind(this),
      getBalances: this.getBalances.bind(this),
      autoLogin: this.autoLogin.bind(this),
      deposit: this.deposit.bind(this),
      withdraw: this.withdraw.bind(this)
    };

    this.walletState.updateWalletConnection = this.updateWalletConnection.bind(
      this
    );

    this.walletState.getEtherscanAddressURL = this.getEtherscanAddressURL.bind(
      this
    );
    this.walletState.getEtherscanTxURL = this.getEtherscanTxURL.bind(this);

    this.appRegistryState.updateAppRegistry = this.updateAppRegistry.bind(this);

    if (this.appRegistryState.maintenanceMode) {
      return (
        <widget-dialog
          visible={true}
          dialogTitle="Under maintenance"
          content={
            <p>
              Sorry! We're currently working on a few things behind the scenes
              to keep the demo functional. Please come back later. In the
              meantime, follow us on Twitter
              <a href="https://twitter.com/statechannels" target="_blank">
                {" "}
                @statechannels{" "}
              </a>
              to learn more and keep up to date on the project.
            </p>
          }
        />
      );
    }

    if (this.loading) {
      return <widget-spinner type="dots" />;
    }

    const localSchemaVersion = window.localStorage.getItem(
      "playground:schemaVersion"
    ) as string;

    if (
      localSchemaVersion &&
      localSchemaVersion !== this.appRegistryState.schemaVersion
    ) {
      return (
        <widget-dialog
          visible={true}
          dialogTitle="A new version of the Playground is available!"
          content="Click OK to update your experience."
          primaryButtonText="OK"
          onPrimaryButtonClicked={this.upgrade.bind(this)}
        />
      );
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
              {this.redirect || {}}
            </div>
          </AppRegistryTunnel.Provider>
        </AccountTunnel.Provider>
      </WalletTunnel.Provider>
    );
  }
}
