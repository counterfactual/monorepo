import { CreateAccountRequest } from "@counterfactual/playground-server";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import NetworkTunnel from "../../../data/network";
import PlaygroundAPIClient from "../../../data/playground-api-client";
import { UserChangeset } from "../../../types";

function buildSignaturePayload(data: UserChangeset) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.address}`
  ].join("\n");
}

@Component({
  tag: "account-register",
  styleUrl: "account-register.scss",
  shadow: true
})
export class AccountRegister {
  @Element() el!: HTMLStencilElement;
  @Prop() connected: boolean = false;
  @Prop() address: string = "";
  @Prop() email: string = "";
  @Prop() username: string = "";
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: UserChangeset = {
    username: "",
    email: "",
    address: this.address
  };

  @State() errors: UserChangeset = {
    username: "",
    email: "",
    address: ""
  };

  login() {
    console.log("login");
  }

  change(key: keyof UserChangeset, event: Event) {
    this.changeset[key] = (event.target as HTMLInputElement).value;
  }

  formSubmitionHandler() {
    const data = this.changeset;

    // We use personal#sign() because eth#sign() is dangerous.
    // See: https://metamask.zendesk.com/hc/en-us/articles/360015488751
    web3.personal.sign(
      buildSignaturePayload(data),
      data.address,
      this.register.bind(this)
    );
  }

  handleMetamaskErrors(error) {
    if (error.message.match(/User denied message signature/)) {
      this.setErrorMessage("user_denied_signature");
    }
  }

  async register(error: Error, signedData: string) {
    // TODO: Handle errors.
    if (error) {
      this.handleMetamaskErrors(error);
      return;
    }

    // Call the API and store the multisig.
    const payload: CreateAccountRequest = {
      ...this.changeset,
      signature: signedData
    };

    try {
      const apiResponse = await PlaygroundAPIClient.createAccount(payload);

      this.updateAccount({
        ...this.changeset,
        multisigAddress: apiResponse.user.multisigAddress
      });

      window.localStorage.setItem("playground:user:token", apiResponse.token);

      this.history.push("/deposit");
    } catch (e) {
      this.setErrorMessage(e.errorCode);
    }
  }

  setErrorMessage(errorCode: string) {
    let update = {};
    this.errors = { username: "", email: "", address: "" };

    switch (errorCode) {
      case "username_required":
        update = { username: "This field is required" };
        break;
      case "email_required":
        update = { email: "This field is required" };
        break;
      case "signature_required":
        update = {
          address:
            "You must sign the operation with Metamask in order to continue"
        };
        break;
      case "invalid_signature":
        update = {
          address: "Something went wrong with your signature. Please try again."
        };
        break;
      case "address_already_registered":
        update = {
          address: "You already have a Playground account with this address."
        };
        break;
      case "user_save_failed":
        update = {
          address:
            "Something went wrong while saving your data. Please try again later."
        };
        break;
      case "user_denied_signature":
        update = {
          address:
            "You must approve the message signature at Metamask in order to proceed."
        };
        break;
    }

    this.errors = { ...this.errors, ...update };
  }

  render() {
    if (this.address) {
      this.changeset.address = this.address;
    }

    return (
      <widget-screen>
        <div slot="header">Create a Playground account</div>

        <form-container onFormSubmitted={e => this.formSubmitionHandler()}>
          <form-input
            label="Username"
            value={this.changeset.username}
            error={this.errors.username}
            onChange={e => this.change("username", e)}
          />
          <form-input
            label="Email address"
            value={this.changeset.email}
            error={this.errors.email}
            onChange={e => this.change("email", e)}
          />
          <form-input
            label="Ethereum address"
            value={this.changeset.address}
            error={this.errors.address}
            disabled={this.connected}
            onChange={
              !this.connected ? e => this.change("address", e) : () => {}
            }
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

AccountTunnel.injectProps(AccountRegister, [
  "address",
  "email",
  "updateAccount",
  "username"
]);

NetworkTunnel.injectProps(AccountRegister, ["connected"]);
