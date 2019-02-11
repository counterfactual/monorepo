import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  Watch
} from "@stencil/core";

import AccountTunnel from "../../../../data/account";
import PlaygroundAPIClient from "../../../../data/playground-api-client";
import { UserSession } from "../../../../types";

function buildSignaturePayload(address: string) {
  return ["PLAYGROUND ACCOUNT LOGIN", `Ethereum address: ${address}`].join(
    "\n"
  );
}

@Component({
  tag: "header-account",
  styleUrl: "header-account.scss",
  shadow: true
})
export class HeaderAccount {
  @Element() el!: HTMLStencilElement;
  @Prop() balance: number = 0;
  @Prop() unconfirmedBalance?: number;
  @Prop({ mutable: true }) user: UserSession = {} as UserSession;
  @Prop({ mutable: true }) authenticated: boolean = false;
  @Prop() fakeConnect: boolean = false;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() provider: Web3Provider = {} as Web3Provider;
  @Prop() signer: Signer = {} as Signer;
  @Event() authenticationChanged: EventEmitter = {} as EventEmitter;

  @Watch("authenticated")
  authenticationChangedHandler() {
    this.authenticationChanged.emit({ authenticated: this.authenticated });
  }

  onLoginClicked() {
    web3.personal.sign(
      web3.toHex(buildSignaturePayload(this.user.ethAddress)),
      this.user.ethAddress,
      this.login.bind(this)
    );
  }

  async componentWillLoad() {
    const token = window.localStorage.getItem(
      "playground:user:token"
    ) as string;

    if (!token) {
      return;
    }

    if (!this.user || !this.user.username) {
      try {
        const user = await PlaygroundAPIClient.getUser(token);
        this.updateAccount({ user });
      } catch {
        window.localStorage.removeItem("playground:user:token");
        return;
      }
    }

    await this.getBalances();

    this.authenticated = true;
  }

  async login(error: Error, signedData: string) {
    // TODO: Handle errors.
    if (error) {
      return this.displayLoginError();
    }

    try {
      const user = await PlaygroundAPIClient.login(
        {
          ethAddress: this.user.ethAddress
        },
        signedData
      );

      await this.getBalances();

      window.localStorage.setItem(
        "playground:user:token",
        user.token as string
      );

      this.updateAccount({ user });

      this.removeError();
    } catch (error) {
      this.displayLoginError();
    }
  }

  async getBalances() {
    if (!this.user.multisigAddress || !this.user.ethAddress) {
      return;
    }

    const multisigBalance = parseFloat(
      ethers.utils.formatEther(
        (await this.provider.getBalance(this.user.multisigAddress)).toString()
      )
    );

    const walletBalance = parseFloat(
      ethers.utils.formatEther(
        (await this.provider.getBalance(this.user.ethAddress)).toString()
      )
    );

    this.updateAccount({
      balance: multisigBalance,
      accountBalance: walletBalance
    });
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
    if (!this.user || !this.user.username) {
      return (
        <div class="account-container">
          <div class="btn-container">
            <button onClick={this.onLoginClicked.bind(this)} class="btn">
              Login
            </button>
            <stencil-route-link url="/register">
              <button class="btn btn-outline">Register</button>
            </stencil-route-link>
          </div>
        </div>
      );
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
              spinner={this.hasUnconfirmedBalance}
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
  "provider",
  "unconfirmedBalance"
]);
