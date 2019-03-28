declare var ga: any;

import { Component, Element, Prop, State, Watch } from "@stencil/core";
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
  @Prop() metamaskUnlocked: boolean = false;
  @Prop() waitForMultisig: () => Promise<void> = async () => {};

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
  @State() stage:
    | "ready"
    | "awaitingForWallet"
    | "creatingAccount"
    | "deployingMultisig"
    | "finished" = "ready";

  componentDidUpdate() {
    if (!this.metamaskUnlocked) {
      this.history.push("/");
      return;
    }
  }

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

  async formSubmissionHandler() {
    this.clearErrorMessage();

    const data = this.changeset;
    const payload = buildRegistrationSignaturePayload(data);

    this.stage = "awaitingForWallet";

    try {
      const signature = await this.signer.signMessage(payload);
      await this.register(signature);
    } catch (e) {
      this.handleMetamaskErrors(e);
      this.stage = "ready";
    }
  }

  handleMetamaskErrors(error) {
    if (error.message.match(/User denied message signature/)) {
      this.setErrorMessage("user_denied_signature");
    }
  }

  @Watch("user")
  onUserUpdated() {
    if (this.user.multisigAddress && this.stage === "deployingMultisig") {
      this.stage = "finished";
    }
  }

  async register(signedMessage: string) {
    try {
      this.stage = "creatingAccount";

      const newAccount = await PlaygroundAPIClient.createAccount(
        this.changeset,
        signedMessage
      );

      this.updateAccount({ user: newAccount });

      window.localStorage.setItem(
        "playground:user:token",
        newAccount.token as string
      );

      ga("set", "userId", newAccount.id);

      this.stage = "deployingMultisig";
      this.waitForMultisig();
    } catch (e) {
      this.setErrorMessage(e.code);
      this.stage = "ready";
    }
  }

  clearErrorMessage() {
    this.errors = { username: "", email: "", ethAddress: "", nodeAddress: "" };
  }

  setErrorMessage(errorCode: string) {
    let update = {};

    this.clearErrorMessage();

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
          ethAddress: "Cannot use same ethereum address twice."
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
    if (this.stage === "finished") {
      return <stencil-router-redirect url="/deposit" />;
    }

    if (this.user.ethAddress) {
      this.changeset.ethAddress = this.user.ethAddress;
    }

    const buttonTexts = {
      ready: "Register",
      awaitingForWallet: "Check Wallet...",
      creatingAccount: "Creating your account...",
      deployingMultisig: "Deploying contract..."
    };

    const inputIsDisabled = this.stage !== "ready";

    let slotElement = (
      <div slot="post">
        Already have an account?{" "}
        <a href="#" onClick={async e => await this.login(e)}>
          Login here
        </a>
      </div>
    );

    if (this.stage === "deployingMultisig") {
      slotElement = (
        <div slot="post">
          <b>This can take around 15-90 seconds.</b>
          <br />
          Please be patient! :)
        </div>
      );
    }

    return (
      <widget-screen exitable={!inputIsDisabled}>
        <div slot="header">Create a Playground Account</div>

        <form-container
          onFormSubmitted={async e => await this.formSubmissionHandler()}
        >
          <form-input
            disabled={inputIsDisabled}
            label="Username"
            value={this.changeset.username}
            error={this.errors.username}
            autofocus={true}
            onChange={e => this.change("username", e)}
          />
          <form-input
            disabled={inputIsDisabled}
            label="Email (optional)"
            value={this.changeset.email}
            error={this.errors.email}
            onChange={e => this.change("email", e)}
          />
          <div class="smallprint">
            <b>Account will be linked to your Ethereum address: </b>
            {this.changeset.ethAddress}
          </div>
          <div class="error">{this.errors.ethAddress}</div>
          <form-button
            class="button"
            disabled={inputIsDisabled}
            spinner={inputIsDisabled}
            onButtonPressed={async e => await this.formSubmissionHandler()}
          >
            {buttonTexts[this.stage]}
          </form-button>
        </form-container>
        {slotElement}
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountRegister, [
  "updateAccount",
  "user",
  "waitForMultisig"
]);

WalletTunnel.injectProps(AccountRegister, [
  "connected",
  "signer",
  "metamaskUnlocked"
]);
