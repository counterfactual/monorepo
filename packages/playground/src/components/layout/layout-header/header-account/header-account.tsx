import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  Watch
} from "@stencil/core";

import AccountTunnel from "../../../../data/account";

@Component({
  tag: "header-account",
  styleUrl: "header-account.scss",
  shadow: true
})
export class HeaderAccount {
  @Element() el!: HTMLStencilElement;
  @Prop() balance: number = 0;
  @Prop() username: string = "";
  @Prop({ mutable: true }) authenticated: boolean = false;
  @Prop() fakeConnect: boolean = false;
  @Event() authenticationChanged: EventEmitter = {} as EventEmitter;

  @Watch("authenticated")
  authenticationChangedHandler() {
    this.authenticationChanged.emit({ authenticated: this.authenticated });
  }

  login() {
    // This will make the UI behave as if the user is really logged in.
    if (this.fakeConnect) {
      console.warn(
        "Faked connection, app thinks it's authenticated but it's not"
      );
      this.authenticated = true;
      return;
    }

    console.log("login");
  }

  get ethBalance() {
    return `${this.balance.toFixed(4)} ETH`;
  }

  render() {
    return this.username ? (
      <div class="info-container">
        <stencil-route-link url="/exchange">
          <header-account-info
            src="/assets/icon/cf.png"
            header="Balance"
            content={this.ethBalance}
          />
        </stencil-route-link>
        <stencil-route-link url="/account">
          <header-account-info
            src="/assets/icon/account.png"
            header="Account"
            content={this.username}
          />
        </stencil-route-link>
      </div>
    ) : (
      <div class="btn-container">
        <button onClick={this.login.bind(this)} class="btn">
          Login
        </button>
        <stencil-route-link url="/register">
          <button class="btn btn-outline">Register</button>
        </stencil-route-link>
      </div>
    );
  }
}

AccountTunnel.injectProps(HeaderAccount, ["balance", "username"]);
