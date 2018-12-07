import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

@Component({
  tag: "app-account",
  styleUrl: "app-account.scss",
  shadow: true
})
export class AppAccount {
  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() authenticated: boolean = false;

  login() {
    console.log("login")
  }

  register() {
    this.history.push("register", {
      name: "register"
    });
  }

  render() {
    return this.authenticated ? (
      <div class="info-container">
        <app-account-info
          src="/assets/icon/cf.png"
          header="Balance"
          content="0.1000 ETH"
        />
        <app-account-info
          src="/assets/icon/account.png"
          header="Account"
          content="username"
        />
      </div>
    ) : (
      <div class="btn-container">
        <button onClick={this.login.bind(this)} class="btn">
          Login
        </button>
        <button
          onClick={this.register.bind(this)}
          class="btn btn-outline"
        >
          Register
        </button>
      </div>
    );
  }
}
