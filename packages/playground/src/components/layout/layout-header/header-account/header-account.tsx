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
  @Prop() network: string = "";
  @Prop() error: { primary: string; secondary: string } = {
    primary: "",
    secondary: ""
  };
  @Prop() web3Detected: boolean = false;
  @Prop() hasDetectedNetwork: boolean = false;
  @Prop() metamaskUnlocked: boolean = false;
  @Prop() networkPermitted: boolean = false;
  @Prop({ mutable: true }) user: UserSession = {} as UserSession;
  @Prop({ mutable: true }) authenticated: boolean = false;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() login: () => Promise<UserSession> = async () => ({} as UserSession);
  @Prop() autoLogin: () => Promise<void> = async () => {};

  @Event() authenticationChanged: EventEmitter = {} as EventEmitter;

  @State() waitMultisigInterval: number = 0 as number;
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

    this.metamaskConfirmationUIOpen = true;
    try {
      this.user = await this.login();
    } catch (error) {
      this.displayLoginError();
    } finally {
      this.metamaskConfirmationUIOpen = false;
    }
  }

  async onConnectMetamask() {
    this.metamaskConfirmationUIOpen = true;
    try {
      await window["ethereum"].enable();
    } catch {
      console.error("Was not able to call `window.ethereum.enable()`");
      window.alert(
        "Your browser does not support enabling your wallet programatically. Please unlock your Web3 wallet and try again."
      );
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

    setTimeout(this.removeError.bind(this), 5000);
  }

  removeError() {
    this.updateAccount({
      error: null
    });
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
              class="btn btn--connect-to-wallet"
            >
              <svg
                class="icon wallet"
                enable-background="new 0 0 50 50"
                viewBox="0 0 50 50"
              >
                <rect fill="none" height="50" width="50" />
                <path
                  d="  M40,14c0,0-25.397,0-30,0c-3.076,0-5,3-5,5v21.384C5,42.934,7.066,45,9.616,45h30.768C42.933,45,45,42.934,45,40.384V18.846  C45,16.299,42.549,14,40,14z"
                  fill="none"
                  stroke="#000000"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-miterlimit="10"
                  stroke-width="2"
                />
                <path
                  d="M37,11V7.658  c0-3.331-0.719-4.292-4.852-3.202c-3.036,0.801-20.801,5.726-20.801,5.726c-5.471,2.062-6.306,3.817-6.306,7.816L5,20.453"
                  fill="none"
                  stroke="#000000"
                  stroke-linejoin="round"
                  stroke-miterlimit="10"
                  stroke-width="2"
                />
                <path d="M38.502,32C37.121,32,36,30.882,36,29.501S37.121,27,38.502,27C39.879,27,41,28.12,41,29.501S39.879,32,38.502,32z" />
              </svg>
              {this.metamaskConfirmationUIOpen
                ? "Check Wallet..."
                : "Connect to Wallet"}
            </button>
          </div>
        </div>
      );
    }

    if (!this.authenticated) {
      return (
        <div class="account-container">
          <div class="btn-container">
            {this.error ? (
              <button
                onClick={this.onLoginClicked.bind(this)}
                class="btn btn-error"
              >
                <widget-tooltip message={this.error.secondary}>
                  <div class="widget-error-message">
                    <img class="icon" src="/assets/icon/error.svg" />
                    {this.error.primary}
                  </div>
                </widget-tooltip>
              </button>
            ) : (
              <button
                onClick={this.onLoginClicked.bind(this)}
                class="btn"
                disabled={this.metamaskConfirmationUIOpen}
              >
                <svg class="icon login" viewBox="0 0 32 32">
                  <g>
                    <path
                      d="M27,3V29a1,1,0,0,1-1,1H6a1,1,0,0,1-1-1V27H7v1H25V4H7V7H5V3A1,1,0,0,1,6,2H26A1,1,0,0,1,27,3ZM12.29,20.29l1.42,1.42,5-5a1,1,0,0,0,0-1.42l-5-5-1.42,1.42L15.59,15H5v2H15.59Z"
                      id="login_account_enter_door"
                    />
                  </g>
                </svg>
                {this.metamaskConfirmationUIOpen ? "Check Wallet..." : "Login"}
              </button>
            )}
            <stencil-route-link url="/register">
              <button class="btn btn-alternate">
                <svg class="icon register" viewBox="0 0 48 48">
                  <g>
                    <path d="M24,26c6.6,0,12-5.4,12-12S30.6,2,24,2c-6.6,0-12,5.4-12,12S17.4,26,24,26z M24,4c5.5,0,10,4.5,10,10s-4.5,10-10,10   c-5.5,0-10-4.5-10-10S18.5,4,24,4z" />
                    <path d="M33,28H15C7.8,28,2,33.8,2,41v5h2v-5c0-6.1,4.9-11,11-11h18V28z" />
                    <polygon points="46,38 40,38 40,32 38,32 38,38 32,38 32,40 38,40 38,46 40,46 40,40 46,40  " />
                  </g>
                </svg>
                Register
              </button>
            </stencil-route-link>
          </div>
        </div>
      );
    }

    return (
      <div class="account-container">
        <div class="info-container">
          <header-balance />
          <stencil-route-link url="/account">
            <header-account-info
              src="/assets/icon/account.svg"
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
  "user",
  "error",
  "updateAccount",
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
