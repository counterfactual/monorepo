declare var ga: any;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import CounterfactualNode from "../../../data/counterfactual";
import PlaygroundAPIClient from "../../../data/playground-api-client";
import WalletTunnel from "../../../data/wallet";
import { UserChangeset, UserSession } from "../../../types";

function buildRegistrationSignaturePayload(data: UserChangeset) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.ethAddress}`,
    `Node address: ${data.nodeAddress}`
  ].join("\n");
}

function buildLoginSignaturePayload(address: string) {
  return ["PLAYGROUND ACCOUNT LOGIN", `Ethereum address: ${address}`].join(
    "\n"
  );
}

@Component({
  tag: "account-register",
  styleUrl: "account-register.scss",
  shadow: true
})
export class AccountRegister {
  @Element() el!: HTMLStencilElement;
  @Prop() connected: boolean = false;

  @Prop() user: UserSession = {} as UserSession;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() signer: Signer = {} as Signer;
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: UserChangeset = {
    username: "",
    email: "",
    ethAddress: this.user.ethAddress,
    nodeAddress: CounterfactualNode.getInstance().publicIdentifier
  };

  @State() errors: UserChangeset = {
    username: "",
    email: "",
    ethAddress: "",
    nodeAddress: ""
  };

  async login(e: MouseEvent) {
    e.preventDefault();

    const signature = await this.signer.signMessage(
      buildLoginSignaturePayload(this.user.ethAddress)
    );

    const user = await PlaygroundAPIClient.login(
      {
        ethAddress: this.user.ethAddress
      },
      signature
    );

    window.localStorage.setItem("playground:user:token", user.token as string);

    this.updateAccount({ user });

    this.history.push("/");
  }

  change(key: keyof UserChangeset, event: Event) {
    this.changeset[key] = (event.target as HTMLInputElement).value;
  }

  formSubmissionHandler() {
    const data = this.changeset;

    // We use personal#sign() because eth#sign() is dangerous.
    // See: https://metamask.zendesk.com/hc/en-us/articles/360015488751
    web3.personal.sign(
      web3.toHex(buildRegistrationSignaturePayload(data)),
      data.ethAddress,
      this.register.bind(this)
    );
  }

  handleMetamaskErrors(error) {
    if (error.message.match(/User denied message signature/)) {
      this.setErrorMessage("user_denied_signature");
    }
  }

  async register(error: Error, signedMessage: string) {
    // TODO: Handle errors.
    if (error) {
      this.handleMetamaskErrors(error);
      return;
    }

    // Call the API and store the multisig.

    try {
      const newAccount = await PlaygroundAPIClient.createAccount(
        this.changeset,
        signedMessage
      );

      this.updateAccount({ user: newAccount });

      window.localStorage.setItem(
        "playground:user:token",
        newAccount.token as string
      );

      ga("set", "userId", newAccount.token);

      this.history.push("/deposit");
    } catch (e) {
      this.setErrorMessage(e.code);
    }
  }

  setErrorMessage(errorCode: string) {
    let update = {};
    this.errors = { username: "", email: "", ethAddress: "", nodeAddress: "" };

    switch (errorCode) {
      case "username_required":
        update = { username: "This field is required" };
        break;
      case "username_already_exists":
        update = {
          username: "This username is not available, try another one."
        };
        break;
      case "email_required":
        update = { email: "This field is required" };
        break;
      case "signature_required":
        update = {
          ethAddress:
            "You must sign the operation with Metamask in order to continue"
        };
        break;
      case "invalid_signature":
        update = {
          ethAddress:
            "Something went wrong with your signature. Please try again."
        };
        break;
      case "address_already_registered":
        update = {
          ethAddress: "You already have a Playground account with this address."
        };
        break;
      case "user_save_failed":
        update = {
          ethAddress:
            "Something went wrong while saving your data. Please try again later."
        };
        break;
      case "user_denied_signature":
        update = {
          ethAddress:
            "You must approve the message signature at Metamask in order to proceed."
        };
        break;
    }

    this.errors = { ...this.errors, ...update };
  }

  render() {
    if (this.user.ethAddress) {
      this.changeset.ethAddress = this.user.ethAddress;
    }

    return (
      <widget-screen>
        <div slot="header">Create a Playground account</div>

        <form-container onFormSubmitted={e => this.formSubmissionHandler()}>
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
            value={this.changeset.ethAddress}
            error={this.errors.ethAddress}
            disabled={this.connected}
          />
          <form-button onButtonPressed={e => this.formSubmissionHandler()}>
            Create account
          </form-button>
        </form-container>

        <div slot="post">
          Already have an account?{" "}
          <a href="#" onClick={async e => await this.login(e)}>
            Login here
          </a>
        </div>
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountRegister, ["updateAccount", "user", "signer"]);

WalletTunnel.injectProps(AccountRegister, ["connected"]);
