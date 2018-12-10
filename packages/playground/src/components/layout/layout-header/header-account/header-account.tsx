import { Component, Prop } from "@stencil/core";

@Component({
  tag: "header-account",
  styleUrl: "header-account.scss",
  shadow: true
})
export class HeaderAccount {
  @Prop() authenticated: boolean = false;

  login() {
    console.log("login");
  }

  render() {
    return this.authenticated ? (
      <div class="info-container">
        <stencil-route-link url="/exchange">
          <header-account-info
            src="/assets/icon/cf.png"
            header="Balance"
            content="0.1000 ETH"
          />
        </stencil-route-link>
        <stencil-route-link url="/account">
          <header-account-info
            src="/assets/icon/account.png"
            header="Account"
            content="username"
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
