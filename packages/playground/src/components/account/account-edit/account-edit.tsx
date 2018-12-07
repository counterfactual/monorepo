import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { UserChangeset } from "../../../types";

@Component({
  tag: "account-edit",
  styleUrl: "account-edit.scss",
  shadow: true
})
export class AccountEdit {
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: UserChangeset = {
    username: "",
    email: "",
    address: ""
  };

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  formSubmitionHandler() {
    console.log(this.changeset);
    this.history.push("/");
  }

  render() {
    return [
      <app-nav />,
      <div class="constraint">
        <h2 class="header">Account Settings</h2>
        <form-container onFormSubmitted={e => this.formSubmitionHandler()}>
          <form-input
            label="Username"
            disabled={true}
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
            disabled={true}
            value={this.changeset.address}
            onChange={e => this.change("address", e)}
          />
          <form-button
            class="button"
            onButtonPressed={e => this.formSubmitionHandler()}
          >
            Save edits
          </form-button>
        </form-container>
      </div>
    ];
  }
}
