import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AppRegistryTunnel from "../../../data/app-registry";
import WalletTunnel from "../../../data/wallet";
import { AppDefinition } from "../../../types";

@Component({
  tag: "app-home",
  styleUrl: "app-home.scss",
  shadow: true
})
export class AppHome {
  @Element() private element: HTMLElement | undefined;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() apps: AppDefinition[] = [];
  @Prop() web3Detected: boolean = false;
  @Prop() hasDetectedNetwork: boolean = false;
  @Prop() networkPermitted: boolean = false;

  @Prop() hasLocalStorage: boolean = false;
  @State() runningApps: AppDefinition[] = [];

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

    return (
      <div class="loading">
        <div class="spinner">
          <div class="bounce1" />
          <div class="bounce2" />
          <div class="bounce3" />
        </div>
      </div>
    );
  }

  checkWeb3Detected() {
    if (this.web3Detected) {
      return;
    }

    return (
      <div class="error-message">
        <h1>404: Wallet Not Found :(</h1>
        <h2>
          This demo has been designed to be used with a Web3-compatible wallet
          such as <a href="https://metamask.io/">Metamask</a> to function.
          Please enable or download one to continue!
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
        <h1>Please Switch to Ropsten</h1>
        <h2>
          The Playground demo is currently only deployed on the Ropsten test
          network. Please switch to continue.
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
      </div>
    );
  }

  render() {
    const content =
      this.checkLocalStorage() ||
      this.checkDetectedNetwork() ||
      this.checkWeb3Detected() ||
      this.checkNetworkPermitted() ||
      this.showApps();

    return this.hasLocalStorage ? (
      <node-listener history={this.history}>
        <layout-header />
        <section class="section fill">
          {content}
          {/* <apps-list apps={this.runningApps} name="Running Apps" /> */}
        </section>
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

AppRegistryTunnel.injectProps(AppHome, ["apps"]);

WalletTunnel.injectProps(AppHome, [
  "web3Detected",
  "networkPermitted",
  "hasDetectedNetwork"
]);
