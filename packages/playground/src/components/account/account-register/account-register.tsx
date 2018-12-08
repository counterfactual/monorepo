import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { UserChangeset } from "../../../types";

@Component({
  tag: "account-register",
  styleUrl: "account-register.scss",
  shadow: true
})
export class AccountRegister {
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: UserChangeset = {
    username: "",
    email: "",
    address: ""
  };

  login() {
    console.log("login");
  }

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  formSubmitionHandler() {
    console.log(this.changeset);
    this.history.push("/deposit");
  }

  render() {
    return (
      <widget-screen>
        <div slot="header">Create a Playground account</div>

        <form-container onFormSubmitted={e => this.formSubmitionHandler()}>
          <form-input
            label="Username"
            value={this.changeset.username}
            onChange={e => this.change("username", e)}
          />
          <form-input
            label="Email address"
            value={this.changeset.email}
            onChange={e => this.change("email", e)}
          />
          <form-input
            label="Ethereum address"
            value={this.changeset.address}
            onChange={e => this.change("address", e)}
          />
          <form-button onButtonPressed={e => this.formSubmitionHandler()}>
            Create account
          </form-button>
        </form-container>

        <div slot="post">
          Already have an account? <a onClick={this.login}>Login here</a>
        </div>
      </widget-screen>
    );
  }
}
