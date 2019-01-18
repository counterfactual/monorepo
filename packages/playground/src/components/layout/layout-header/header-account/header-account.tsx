import { UserSession } from "@counterfactual/playground-server";
import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  Watch
} from "@stencil/core";

import AccountTunnel from "../../../../data/account";
import PlaygroundAPIClient from "../../../../data/playground-api-client";

function buildSignaturePayload(address: string) {
  return ["PLAYGROUND ACCOUNT LOGIN", `Ethereum address: ${address}`].join(
    "\n"
  );
}

@Component({
  tag: "header-account",
  styleUrl: "header-account.scss",
  shadow: true
})
export class HeaderAccount {
  @Element() el!: HTMLStencilElement;
  @Prop() balance: number = 0;
  @Prop() user: UserSession = {} as UserSession;
  @Prop({ mutable: true }) authenticated: boolean = false;
  @Prop() fakeConnect: boolean = false;
  @Prop() updateAccount: (e) => void = e => {};
  @Event() authenticationChanged: EventEmitter = {} as EventEmitter;

  @Watch("authenticated")
  authenticationChangedHandler() {
    this.authenticationChanged.emit({ authenticated: this.authenticated });
  }

  onLoginClicked() {
    web3.personal.sign(
      buildSignaturePayload(this.user.ethAddress),
      this.user.ethAddress,
      this.login.bind(this)
    );
  }

  async componentWillLoad() {
    const token = window.localStorage.getItem(
      "playground:user:token"
    ) as string;

    if (!token) {
      return;
    }

    const user = await PlaygroundAPIClient.getUser(token);

    web3.eth.getBalance(
      user.multisigAddress,
      web3.eth.defaultBlock,
      (err, result) => {
        const balance = parseFloat(ethers.utils.formatEther(result.toString()));

        this.updateAccount({
          user,
          balance
        });

        this.authenticated = true;
      }
    );
  }

  async login(error: Error, signedData: string) {
    // TODO: Handle errors.
    if (error) {
      throw error;
    }

    try {
      const user = await PlaygroundAPIClient.login(
        {
          ethAddress: this.user.ethAddress
        },
        signedData
      );

      web3.eth.getBalance(
        user.multisigAddress,
        web3.eth.defaultBlock,
        (err, result) => {
          const balance = parseFloat(
            ethers.utils.formatEther(result.toString())
          );

          this.updateAccount({
            user,
            balance
          });

          this.authenticated = true;

          // TODO: Define schema for DB in localStorage.
          window.localStorage.setItem(
            "playground:user:token",
            user.token as string
          );
        }
      );
    } catch (error) {
      throw error;
    }
  }

  get ethBalance() {
    return `${this.balance.toFixed(4)} ETH`;
  }

  render() {
    return this.user.username ? (
      <div class="info-container">
        <stencil-route-link url="/exchange">
          <header-account-info
            src="/assets/icon/cf.png"
            header="Balance"
            content={this.ethBalance}
          />
        </stencil-route-link>
        <stencil-route-link url="/account">
          <header-account-info
            src="/assets/icon/account.png"
            header="Account"
            content={this.user.username}
          />
        </stencil-route-link>
      </div>
    ) : (
      <div class="btn-container">
        <button onClick={this.onLoginClicked.bind(this)} class="btn">
          Login
        </button>
        <stencil-route-link url="/register">
          <button class="btn btn-outline">Register</button>
        </stencil-route-link>
      </div>
    );
  }
}

AccountTunnel.injectProps(HeaderAccount, ["balance", "user", "updateAccount"]);
