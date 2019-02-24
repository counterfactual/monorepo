import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch
} from "@stencil/core";

import AccountTunnel from "../../../../data/account";
import WalletTunnel from "../../../../data/wallet";
import { UserSession } from "../../../../types";

@Component({
  tag: "header-account",
  styleUrl: "header-account.scss",
  shadow: true
})
export class HeaderAccount {
  @Element() el!: HTMLStencilElement;
  @Prop() balance: number = 0;
  @Prop() network: string = "";
  @Prop() web3Detected: boolean = false;
  @Prop() hasDetectedNetwork: boolean = false;
  @Prop() metamaskUnlocked: boolean = false;
  @Prop() networkPermitted: boolean = false;
  @Prop() unconfirmedBalance?: number;
  @Prop() pendingAccountFunding?: any;
  @Prop({ mutable: true }) user: UserSession = {} as UserSession;
  @Prop({ mutable: true }) authenticated: boolean = false;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() login: () => Promise<UserSession> = async () => ({} as UserSession);
  @Prop() autoLogin: () => Promise<void> = async () => {};

  @Event() authenticationChanged: EventEmitter = {} as EventEmitter;

  @State() waitMultisigInterval: NodeJS.Timeout = {} as NodeJS.Timeout;
  @State() metamaskConfirmationUIOpen: boolean = false;

  // TODO: This is a very weird way to prevent dual-execution of this lifecycle event.
  // But it works. See componentWillLoad() and componentDidUnload().
  static busy = false;

  @Watch("authenticated")
  authenticationChangedHandler() {
    this.authenticationChanged.emit({ authenticated: this.authenticated });
  }

  @Watch("user")
  userChangedHandler() {
    this.authenticated = !!(this.user && this.user.id);
  }

  async onLoginClicked() {
    this.removeError();

    try {
      this.user = await this.login();
    } catch (error) {
      this.displayLoginError();
    }
  }

  async onConnectMetamask() {
    this.metamaskConfirmationUIOpen = true;
    try {
      await window["ethereum"].enable();
      this.metamaskConfirmationUIOpen = false;
    } catch {
    } finally {
      this.metamaskConfirmationUIOpen = false;
    }
  }

  async componentWillLoad() {
    if (HeaderAccount.busy) {
      return;
    }

    await this.autoLogin();

    HeaderAccount.busy = true;
  }

  componentDidUnload() {
    HeaderAccount.busy = false;
  }

  displayLoginError() {
    this.updateAccount({
      error: {
        primary: "Login Failed",
        secondary: "You may not have a Playground account yet. Try registering."
      }
    });
  }

  removeError() {
    this.updateAccount({
      error: null
    });
  }

  get ethBalance() {
    return `${(this.unconfirmedBalance || this.balance).toFixed(4)} ETH`;
  }

  get hasUnconfirmedBalance() {
    return !isNaN(this.unconfirmedBalance as number);
  }

  render() {
    if (!this.hasDetectedNetwork) {
      return;
    }

    if (!this.web3Detected) {
      return (
        <div class="account-container">
          <widget-error-message />
          <div class="message-container">No Ethereum Connection</div>
        </div>
      );
    }

    if (!this.networkPermitted) {
      return (
        <div class="account-container">
          <widget-error-message />
          <div class="message-container">Wrong Network</div>
        </div>
      );
    }

    if (!this.metamaskUnlocked) {
      return (
        <div class="account-container">
          <widget-error-message />
          <div class="btn-container">
            <button
              disabled={this.metamaskConfirmationUIOpen}
              onClick={this.onConnectMetamask.bind(this)}
              class="btn"
            >
              {this.metamaskConfirmationUIOpen
                ? "Check Wallet"
                : "Connect to Metamask"}
            </button>
          </div>
        </div>
      );
    }

    if (!this.authenticated) {
      return (
        <div class="account-container">
          <widget-error-message />
          <div class="btn-container">
            <button onClick={this.onLoginClicked.bind(this)} class="btn">
              Login
            </button>
            <stencil-route-link url="/register">
              <button class="btn btn-alternate">Register</button>
            </stencil-route-link>
          </div>
        </div>
      );
    }

    let tooltip = "";

    if (this.hasUnconfirmedBalance) {
      tooltip = "We're waiting for the network to confirm your latest deposit.";
    }

    if (!this.user.multisigAddress) {
      tooltip =
        "We're configuring your state channel with the Playground. This can take 15-90 seconds, depending on network speed.";
    }

    return (
      <div class="account-container">
        <widget-error-message />
        <div class="info-container">
          <stencil-route-link url="/exchange">
            <header-account-info
              src="/assets/icon/cf.png"
              header="Balance"
              content={this.ethBalance}
              spinner={this.hasUnconfirmedBalance || !this.user.multisigAddress}
              tooltip={tooltip}
            />
          </stencil-route-link>
          <stencil-route-link url="/account">
            <header-account-info
              src="/assets/icon/account.png"
              header="Account"
              content={this.user.username}
            />
          </stencil-route-link>
        </div>
      </div>
    );
  }
}

AccountTunnel.injectProps(HeaderAccount, [
  "balance",
  "user",
  "updateAccount",
  "unconfirmedBalance",
  "pendingAccountFunding",
  "login",
  "autoLogin"
]);

WalletTunnel.injectProps(HeaderAccount, [
  "network",
  "web3Detected",
  "networkPermitted",
  "metamaskUnlocked",
  "hasDetectedNetwork"
]);
