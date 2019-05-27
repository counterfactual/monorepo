import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import AppRegistryTunnel from "../../../data/app-registry";
import WalletTunnel from "../../../data/wallet";
import { AppDefinition, UserSession } from "../../../types";

@Component({
  tag: "app-home",
  styleUrl: "app-home.scss",
  shadow: true
})
export class AppHome {
  @Element() private element: HTMLElement | undefined;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() apps: AppDefinition[] = [];
  @Prop() canUseApps: boolean = false;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() web3Detected: boolean = false;
  @Prop() hasDetectedNetwork: boolean = false;
  @Prop() networkPermitted: boolean = false;

  @Prop() enoughCounterpartyBalance: boolean = true;
  @Prop() enoughLocalBalance: boolean = true;
  @Prop() ethPendingDepositAmountWei: any;
  @Prop() ethPendingDepositTxHash: string = "";

  @Prop() hasLocalStorage: boolean = false;
  @Prop() hasCorruptStateChannelState: boolean = false;
  @State() runningApps: AppDefinition[] = [];

  @Prop() deleteAccount?: () => Promise<void>;

  appClickedHandler(e) {
    this.history.push(e.detail.dappContainerUrl, e.detail);
  }

  async componentWillLoad() {
    // TODO: This is still mocked.
    this.runningApps = [{ ...this.apps[0], notifications: 11 }];
  }

  checkLocalStorage() {
    if (this.hasLocalStorage) {
      return;
    }

    const texts = {
      brave: {
        title: "Please, lower your Shields!",
        instruction: (
          <span>
            Please, turn off the <i>Shields Up</i> feature for this site to
            continue.
          </span>
        )
      },
      chrome: {
        title: "Please, allow site data!",
        instruction: (
          <span>
            Please, unblock <i>Cookies</i> in your settings, under{" "}
            <i>Privacy → Content settings</i>.
          </span>
        )
      },
      edge: {
        title: "Please, unblock us!",
        instruction: (
          <span>
            Please, uncheck the <i>Block all cookies</i> option in your
            settings, under <i>Advanced Settings → Cookies</i>.
          </span>
        )
      },
      firefox: {
        title: "Please, enable DOM Storage!",
        instruction: (
          <span>
            Please, set the <code>dom.storage.enabled</code> key to{" "}
            <code>true</code> in your <code>about:config</code> screen.
          </span>
        )
      },
      safari: {
        title: "Please, unblock us!",
        instruction: (
          <span>
            Please, uncheck the <i>Always block</i> option in your settings,
            under <i>Preferences → Privacy → Cookies and website data</i>.
          </span>
        )
      },
      default: {
        title: "Please, allow us to store data",
        instruction: (
          <span>
            The Playground demo uses Local Storage to work properly. Please,
            configure your browser to grant us access.
          </span>
        )
      }
    };

    let text: { title: string; instruction: JSX.Element } = {} as {
      title: string;
      instruction: JSX.Element;
    };

    if (navigator.userAgent.indexOf("brave") >= 0) {
      text = texts.brave;
    } else if (
      navigator.userAgent.indexOf("Chrome") >= 0 &&
      navigator.vendor.indexOf("Google") >= 0
    ) {
      text = texts.chrome;
    } else if (navigator.userAgent.indexOf("Edge") >= 0) {
      text = texts.edge;
    } else if (navigator.userAgent.indexOf("Safari") >= 0) {
      text = texts.safari;
    } else if (navigator.userAgent.indexOf("Firefox") >= 0) {
      text = texts.firefox;
    } else {
      text = texts.default;
    }

    return (
      <div class="error-message">
        <h1>{text.title}</h1>
        <h2>
          The Playground Demo uses Local Storage to work properly.{" "}
          {text.instruction}
        </h2>
        <p>
          <strong>What do we store?</strong> Basic information the demo needs to
          work, such as a mnemonic key to generate the address for your local
          Node instance, and the data the Node itself stores about the activity
          in the state channels you are part of.
        </p>
      </div>
    );
  }

  checkDetectedNetwork() {
    if (this.hasDetectedNetwork) {
      return;
    }

    return <widget-spinner type="dots" />;
  }

  getSuggestedWallet() {
    return screen.width < 600 ? (
      <span>
        <a href="https://wallet.coinbase.com/">Coinbase Wallet</a>,
        <a href="https://www.cipherbrowser.com/"> Cipher</a>, or
        <a href="https://dev.status.im/"> Status</a>
      </span>
    ) : (
      <a href="https://metamask.io/">Metamask</a>
    );
  }

  checkWeb3Detected() {
    if (this.web3Detected) {
      return;
    }

    return (
      <div class="error-message">
        <h2>
          Welcome to the Playground demo :) This demo requires a Web3-compatible
          wallet such as {this.getSuggestedWallet()}. Please enable or download
          one to continue!
        </h2>
      </div>
    );
  }

  checkNetworkPermitted() {
    if (this.networkPermitted) {
      return;
    }

    return (
      <div class="error-message">
        <h1>Please Switch to Kovan</h1>
        <h2>
          The Playground demo is currently only deployed on the Kovan test
          network. Please switch to continue.
        </h2>
      </div>
    );
  }

  checkCorruptState() {
    if (!this.hasCorruptStateChannelState) {
      return;
    }

    return (
      <div class="error-message">
        <h1>☠️ Corrupt Wallet State</h1>
        <h2>
          Unfortunately, your state channel state has become corrupted or lost.
          Please <a onClick={this.deleteAccount}>click here</a> to start over.
        </h2>
      </div>
    );
  }

  showApps() {
    return (
      <div class="container">
        <apps-list
          apps={this.apps}
          onAppClicked={e => this.appClickedHandler(e)}
          name="Available Apps"
        />
        {this.welcomeText()}
      </div>
    );
  }

  checkUserNotLoggedIn() {
    if (this.user.id) {
      return;
    }

    return this.welcomeText();
  }

  welcomeText() {
    return (
      <div
        class="welcome-message"
        style={{ display: this.user.id ? "contents" : "flex" }}
      >
        {!this.user.id ? <h1>Welcome! 👋</h1> : undefined}
        {!this.user.id ? (
          <h2>
            This a demonstration of{" "}
            <a href="https://counterfactual.com/statechannels">
              generalized state channels
            </a>{" "}
            on Ethereum.
          </h2>
        ) : (
          undefined
        )}
        <div class="flex-container">
          <div class="flex-item">
            <h3>What's going on here?</h3>
            <p>
              You are now a Node in a hub-and-spoke state channels network demo
              called the Counterfactual Playground, running on Kovan. This
              webpage is your state channels wallet. Our team runs the hub.
              Users that connect to our hub can use an unlimited number of
              off-chain applications with <b>zero fees</b> and{" "}
              <b>zero block confirmation times</b>. Want to try? Register or
              login to start.
            </p>
          </div>
          <div class="flex-item">
            <h3>How does it work?</h3>
            <p>
              This demo is built using{" "}
              <a href="https://counterfactual.com">Counterfactual</a>. We've
              written all about the internal architecture in{" "}
              <a href="https://medium.com/statechannels/development-update-3-counterfactual-playground-release-f428be4b8950">
                this blog post
              </a>
              . To learn more, check out our{" "}
              <a href="https://github.com/counterfactual">GitHub</a> page and
              follow us on{" "}
              <a href="https://twitter.com/statechannels">Twitter</a>
            </p>
          </div>
        </div>
        <div class="flex-container">
          <div class="flex-item">
            <h3>What is Counterfactual?</h3>
            <p>
              Counterfactual is an open-source project comprised of several
              components:
              <ul>
                <li>• A library for off-chain applications</li>
                <li>• An intuitive generalized state channels protocol</li>
                <li>• A set of Ethereum smart contracts</li>
              </ul>{" "}
              It enables developers to build trustless distributed applications
              with minimal overhead. Watch{" "}
              <a href="https://youtu.be/tfKtLNlPL2w?t=72" target="_blank">
                our recent talk
              </a>{" "}
              at EthCC for more.
            </p>
          </div>
          <div class="flex-item">
            <h3>How is this secure?</h3>
            <p>
              Counterfactual uses state channels, a Layer 2 scalability
              technique. For a complete overview, read{" "}
              <a
                href="https://medium.com/l4-media/making-sense-of-ethereums-layer-2-scaling-solutions-state-channels-plasma-and-truebit-22cb40dcc2f4"
                target="_blank"
              >
                Making Sense of Layer 2
              </a>{" "}
              or watch the associated{" "}
              <a
                href="https://www.youtube.com/watch?v=RghzB4C9aSg"
                target="_blank"
              >
                talk from Devcon IV
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  checkInsufficientBalance() {
    if (!this.user || !this.user.multisigAddress) {
      return;
    }

    if (!this.enoughLocalBalance) {
      return (
        <div class="error-message">
          <h1>Insufficient funds</h1>
          <h2>
            Your balance needs to be of at least 0.01 ETH.
            <br />
            <br />
            <stencil-route-link url="/exchange">
              Click here
            </stencil-route-link>{" "}
            to deposit more funds.
          </h2>
        </div>
      );
    }

    if (!this.enoughCounterpartyBalance) {
      return (
        <div class="error-message">
          <h1>The Playground Node has insufficient funds</h1>
          <h2>
            Eventually we'll take care of this automatically, but in the
            meantime, you'll need to deposit some ETH.
            <br />
            <br />
            <stencil-route-link url="/exchange">
              Click here
            </stencil-route-link>{" "}
            to deposit more funds.
          </h2>
        </div>
      );
    }
  }

  render() {
    const content =
      this.checkLocalStorage() ||
      this.checkDetectedNetwork() ||
      this.checkWeb3Detected() ||
      this.checkNetworkPermitted() ||
      this.checkUserNotLoggedIn() ||
      this.checkInsufficientBalance() ||
      this.checkCorruptState() ||
      this.showApps();

    return this.hasLocalStorage ? (
      <node-listener history={this.history}>
        <layout-header />
        <section class="section fill">
          {content}
          {/* <apps-list apps={this.runningApps} name="Running Apps" /> */}
        </section>
        <a
          id="discordbutton"
          href="https://discord.gg/7SMbDz"
          target="_blank"
        />
      </node-listener>
    ) : (
      <div>
        <layout-header />
        <section class="section fill">
          {content}
          {/* <apps-list apps={this.runningApps} name="Running Apps" /> */}
        </section>
      </div>
    );
  }
}

AppRegistryTunnel.injectProps(AppHome, ["apps", "canUseApps"]);

WalletTunnel.injectProps(AppHome, [
  "web3Detected",
  "networkPermitted",
  "hasDetectedNetwork"
]);

AccountTunnel.injectProps(AppHome, [
  "user",
  "hasCorruptStateChannelState",
  "enoughCounterpartyBalance",
  "enoughLocalBalance",
  "ethPendingDepositAmountWei",
  "ethPendingDepositTxHash",
  "deleteAccount"
]);
