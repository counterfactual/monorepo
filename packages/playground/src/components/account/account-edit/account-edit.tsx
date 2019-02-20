import { Component, Element, Prop, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import { UserChangeset, UserSession } from "../../../types";

@Component({
  tag: "account-edit",
  styleUrl: "account-edit.scss",
  shadow: true
})
export class AccountEdit {
  @Element() el!: HTMLStencilElement;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: UserChangeset = {
    username: "",
    email: "",
    ethAddress: "",
    nodeAddress: ""
  };

  // required to initialize the changeset
  // as `injectProps` runs after the constructor
  @Watch("user")
  updateChangeset() {
    this.changeset.ethAddress = this.user.ethAddress;
    this.changeset.email = this.user.email;
    this.changeset.username = this.user.username;
    this.changeset.nodeAddress = this.user.nodeAddress;
  }

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  formSubmissionHandler() {
    this.updateAccount(this.changeset);
    this.history.push("/");
  }

  render() {
    return [
      <layout-header />,
      <div class="constraint">
        <widget-header>Account Settings</widget-header>
        <form-container onFormSubmitted={e => this.formSubmissionHandler()}>
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
            value={this.changeset.ethAddress}
          />
          <form-button
            class="button"
            onButtonPressed={e => this.formSubmissionHandler()}
          >
            Save edits
          </form-button>
        </form-container>
      </div>
    ];
  }
}

AccountTunnel.injectProps(AccountEdit, ["updateAccount", "user"]);
