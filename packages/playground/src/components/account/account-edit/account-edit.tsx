import { Component, Element, Prop, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import { UserChangeset } from "../../../types";

@Component({
  tag: "account-edit",
  styleUrl: "account-edit.scss",
  shadow: true
})
export class AccountEdit {
  @Element() el!: HTMLStencilElement;
  @Prop() address: string = "";
  @Prop() email: string = "";
  @Prop() username: string = "";
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: UserChangeset = {
    username: "",
    email: "",
    address: ""
  };

  // required to initialize the changeset
  // as `injectProps` runs after the constructor
  @Watch("address")
  updateAddress() {
    this.changeset.address = this.address;
  }
  @Watch("email")
  updateEmail() {
    this.changeset.email = this.email;
  }
  @Watch("username")
  updateUsername() {
    this.changeset.username = this.username;
  }

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  formSubmitionHandler() {
    console.log(this.changeset);
    this.updateAccount(this.changeset);
    this.history.push("/");
  }

  render() {
    return [
      <layout-header />,
      <div class="constraint">
        <widget-header>Account Settings</widget-header>
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

AccountTunnel.injectProps(AccountEdit, [
  "address",
  "email",
  "updateAccount",
  "username"
]);
