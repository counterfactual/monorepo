import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import PlaygroundAPIClient from "../../../data/playground-api-client";
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
  @Prop() logout: () => void = () => {};

  @State() userLoaded: boolean = false;

  changeset: UserChangeset = {
    username: "",
    email: "",
    ethAddress: "",
    nodeAddress: "",
    id: ""
  };

  // required to initialize the changeset
  // as `injectProps` runs after the constructor
  @Watch("user")
  updateChangeset() {
    if (this.userLoaded) {
      return;
    }

    this.changeset.id = this.user.id;
    this.changeset.ethAddress = this.user.ethAddress;
    this.changeset.email = this.user.email;
    this.changeset.username = this.user.username;
    this.changeset.nodeAddress = this.user.nodeAddress;
    this.userLoaded = true;
  }

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  async formSubmissionHandler() {
    const updatedUser = await PlaygroundAPIClient.updateAccount(this.changeset);

    this.updateAccount({ user: updatedUser });

    window.localStorage.setItem(
      "playground:user:token",
      updatedUser.token as string
    );

    this.history.push("/");
  }

  logoutClickedHandler() {
    this.logout();
    this.history.push("/");
  }

  render() {
    return (
      <widget-screen>
        <div slot="header">Account Settings</div>
        <form-container onFormSubmitted={e => this.formSubmissionHandler()}>
          <form-input
            label="Username"
            disabled={true}
            value={this.changeset.username}
          />
          <form-input
            label="Email address"
            value={this.changeset.email}
            onChange={e => this.change("email", e)}
          />
          <div class="smallprint">
            <b>Your account is linked to your Ethereum address: </b>
            {this.changeset.ethAddress}
          </div>
          <form-button
            class="button"
            onButtonPressed={e => this.formSubmissionHandler()}
          >
            Save changes
          </form-button>
          <form-button
            class="button button--secondary"
            onButtonPressed={e => this.logoutClickedHandler()}
          >
            Log out
          </form-button>
        </form-container>
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountEdit, ["updateAccount", "user", "logout"]);
